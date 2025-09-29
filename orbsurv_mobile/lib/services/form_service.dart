import 'dart:convert';
import 'dart:io';

class SubmissionResponse {
  const SubmissionResponse({
    required this.success,
    required this.message,
    required this.statusCode,
    this.data,
  });

  final bool success;
  final String message;
  final int statusCode;
  final Map<String, dynamic>? data;
}

class FormSubmissionException implements Exception {
  FormSubmissionException(this.message, {required this.statusCode, this.body});

  final String message;
  final int statusCode;
  final Map<String, dynamic>? body;

  @override
  String toString() => 'FormSubmissionException($statusCode): $message';
}

class OrbsurvFormsService {
  OrbsurvFormsService({HttpClient? client, String? apiBase})
      : _client = client ?? HttpClient(),
        _apiBase = _normalizeBase(apiBase ?? _envBase);

  static const String _defaultBase = 'http://127.0.0.1:8000';
  static const String _envBase = String.fromEnvironment(
    'ORBSURV_API_BASE',
    defaultValue: _defaultBase,
  );

  final HttpClient _client;
  final String _apiBase;

  Future<SubmissionResponse> submit({
    required String endpoint,
    required Map<String, dynamic> payload,
  }) async {
    final Uri uri = _resolveEndpoint(endpoint);
    final HttpClientRequest request = await _client.postUrl(uri);
    request.headers.contentType = ContentType.json;
    request.add(utf8.encode(jsonEncode(payload)));

    final HttpClientResponse response = await request.close();
    final String body = await response.transform(utf8.decoder).join();
    final Map<String, dynamic>? parsed = body.isEmpty
        ? null
        : jsonDecode(body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final String message = parsed != null
          ? (parsed['error']?.toString() ?? parsed['message']?.toString() ?? 'Request failed')
          : 'Request failed (${response.statusCode})';
      throw FormSubmissionException(
        message,
        statusCode: response.statusCode,
        body: parsed,
      );
    }

    final String message = parsed != null
        ? (parsed['message']?.toString() ?? 'Submission received')
        : 'Submission received';

    return SubmissionResponse(
      success: true,
      message: message,
      statusCode: response.statusCode,
      data: parsed,
    );
  }

  Uri _resolveEndpoint(String endpoint) {
    if (endpoint.isEmpty) {
      throw ArgumentError('Endpoint cannot be empty');
    }

    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return Uri.parse(endpoint);
    }

    final String normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    return Uri.parse('$_apiBase$normalizedEndpoint');
  }

  static String _normalizeBase(String base) {
    final String trimmed = base.trim();
    if (trimmed.isEmpty) {
      return _defaultBase;
    }
    return trimmed.endsWith('/') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
  }
}
