(function () {
  const wsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host || 'localhost:8000';
    return `${protocol}://System.Management.Automation.Internal.Host.InternalHost/ws`;
  };

  const overlay = document.getElementById('overlay');
  const ctx = overlay.getContext('2d');
  const preview = document.getElementById('preview');
  const eventsList = document.getElementById('events');
  const modeEl = document.getElementById('state-mode');
  const posEl = document.getElementById('state-pos');
  const cmdEl = document.getElementById('state-cmd');
  const fpsEl = document.getElementById('state-fps');
  const inputEl = document.getElementById('preview-url');
  const loadBtn = document.getElementById('load-preview');
  const pauseBtn = document.getElementById('pause-preview');

  function resizeCanvas() {
    const rect = preview.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    overlay.style.left = `${preview.offsetLeft}px`;
    overlay.style.top = `${preview.offsetTop}px`;
  }

  function drawTracks(tracks) {
    resizeCanvas();
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.lineWidth = 2;
    ctx.font = '14px system-ui';
    tracks.forEach((track) => {
      const x = track.x * overlay.width;
      const y = track.y * overlay.height;
      const w = track.w * overlay.width;
      const h = track.h * overlay.height;
      ctx.strokeStyle = track.cls === 'person' ? '#38bdf8' : '#f97316';
      ctx.fillStyle = 'rgba(14, 21, 37, 0.75)';
      ctx.strokeRect(x, y, w, h);
      const label = track.cls === 'person' ? 'Person' : 'Vehicle';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 20, textWidth + 12, 20);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, x + 6, y - 6);
    });
  }

  function pushEvent(kind, payload) {
    const li = document.createElement('li');
    li.innerHTML = '<strong></strong><span></span>';
    eventsList.prepend(li);
    while (eventsList.children.length > 20) {
      eventsList.lastChild.remove();
    }
  }

  function connect() {
    const socket = new WebSocket(wsUrl());
    socket.addEventListener('open', () => {
      console.log('WebSocket connected');
    });
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.kind === 'tracks') {
          drawTracks(message.payload.tracks);
          pushEvent('tracks', message.payload.tracks.slice(0, 3));
        } else if (message.kind === 'state') {
          modeEl.textContent = message.payload.mode;
          posEl.textContent = message.payload.rail_pos.toFixed(3);
          cmdEl.textContent = message.payload.cmd_vel.toFixed(3);
        } else if (message.kind === 'metrics') {
          fpsEl.textContent = message.payload.fps.toFixed(1);
        } else {
          pushEvent('event', message.payload);
        }
      } catch (error) {
        console.warn('Unable to parse WS message', error);
      }
    });
    socket.addEventListener('close', () => {
      console.warn('WebSocket closed, retrying in 3s');
      setTimeout(connect, 3000);
    });
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('load', () => {
    resizeCanvas();
    connect();
  });

  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const url = inputEl.value.trim();
      if (!url) return;
      preview.src = url;
      preview.play().catch(() => {
        alert('Unable to play preview stream.');
      });
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (preview.paused) {
        preview.play().catch(() => {});
        pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        preview.pause();
        pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    });
  }

})();
