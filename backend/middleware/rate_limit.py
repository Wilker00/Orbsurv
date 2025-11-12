"""Rate limiting middleware using Redis with in-memory fallback."""
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import HTTPException, Request, status

from ..settings import settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as aioredis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, rate limiting will fall back to in-process storage")

_redis_client: Optional[aioredis.Redis] = None
_in_memory_lock = asyncio.Lock()
_in_memory_buckets: dict[str, deque[float]] = defaultdict(deque)


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Get or create Redis client."""
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is None and settings.redis_url:
        try:
            _redis_client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await _redis_client.ping()
            logger.info("Redis connection established for rate limiting")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Rate limiting disabled.")
            return None
    
    return _redis_client


async def close_redis_client() -> None:
    """Close Redis client connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


def get_client_identifier(request: Request, email: Optional[str] = None) -> str:
    """Get identifier for rate limiting (IP address or user email)."""
    if email:
        # Use email for per-user rate limiting
        return f"rate_limit:email:{email}"
    
    # Try to get IP from various headers (for proxies/load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    return f"rate_limit:ip:{ip}"


async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Check if request is within rate limit.
    
    Returns:
        (is_allowed, remaining_requests, reset_after_seconds)
    """
    redis_client = await get_redis_client()
    
    if not redis_client:
        return await _check_in_memory_rate_limit(key, max_requests, window_seconds)
    
    try:
        # Use fixed window algorithm
        current_time = await redis_client.time()
        current_timestamp = current_time[0] + current_time[1] / 1_000_000
        
        # Create window key (resets every window_seconds)
        window_number = int(current_timestamp / window_seconds)
        window_key = f"{key}:{window_number}"
        
        # Get current count
        count = await redis_client.get(window_key)
        count = int(count) if count else 0
        
        if count >= max_requests:
            # Calculate when window resets
            next_window_start = (window_number + 1) * window_seconds
            reset_after = int(next_window_start - current_timestamp)
            return False, 0, reset_after
        
        # Increment counter
        await redis_client.incr(window_key)
        await redis_client.expire(window_key, window_seconds)
        
        remaining = max_requests - count - 1
        return True, remaining, window_seconds
    
    except Exception as e:
        logger.error(f"Rate limit check failed: {e}")
        # On error, allow the request (fail open)
        return True, max_requests, window_seconds


async def _check_in_memory_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """Simple sliding-window counter for environments without Redis."""
    now = time.monotonic()
    async with _in_memory_lock:
        bucket = _in_memory_buckets[key]

        # Drop timestamps older than the window
        while bucket and now - bucket[0] >= window_seconds:
            bucket.popleft()

        if len(bucket) >= max_requests:
            oldest = bucket[0]
            reset_after = max(1, int(window_seconds - (now - oldest)))
            return False, 0, reset_after

        bucket.append(now)
        remaining = max_requests - len(bucket)
        return True, remaining, window_seconds


def reset_in_memory_counters() -> None:
    """Clear in-memory buckets (useful for tests)."""
    _in_memory_buckets.clear()


async def rate_limit_middleware(
    request: Request,
    max_requests: int,
    window_seconds: int,
    identifier: Optional[str] = None,
    email: Optional[str] = None,
) -> None:
    """
    Rate limiting middleware.
    
    Raises HTTPException if rate limit exceeded.
    """
    if identifier is None:
        identifier = get_client_identifier(request, email=email)
    
    is_allowed, remaining, reset_after = await check_rate_limit(
        identifier, max_requests, window_seconds
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {reset_after} seconds.",
            headers={
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_after),
                "Retry-After": str(reset_after),
            },
        )

