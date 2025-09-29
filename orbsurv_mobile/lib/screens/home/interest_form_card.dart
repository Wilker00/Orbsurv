import 'dart:io';

import 'package:flutter/material.dart';

import 'package:orbsurv_mobile/services/form_service.dart';

class InterestFormCard extends StatefulWidget {
  const InterestFormCard({
    super.key,
    required this.title,
    required this.description,
    required this.endpoint,
    required this.ctaLabel,
    required this.formsService,
    this.icon,
    this.successMessage = 'Thanks! We received your submission.',
    this.extraPayload = const {},
  });

  final String title;
  final String description;
  final String endpoint;
  final String ctaLabel;
  final String successMessage;
  final OrbsurvFormsService formsService;
  final IconData? icon;
  final Map<String, dynamic> extraPayload;

  @override
  State<InterestFormCard> createState() => _InterestFormCardState();
}

class _InterestFormCardState extends State<InterestFormCard> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();

  bool _isSubmitting = false;
  String? _statusMessage;
  bool _isError = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isSubmitting = true;
      _statusMessage = 'Sending…';
      _isError = false;
    });

    try {
      final payload = {
        'email': _emailController.text.trim(),
        ...widget.extraPayload,
      };
      final response = await widget.formsService.submit(
        endpoint: widget.endpoint,
        payload: payload,
      );

      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _statusMessage = widget.successMessage;
        _isError = false;
      });
      _emailController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message)),
      );
    } on FormSubmissionException catch (error) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _statusMessage = error.message;
        _isError = true;
      });
    } on SocketException {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _statusMessage = 'Network error. Try again when you have a connection.';
        _isError = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _statusMessage = 'Something went wrong. Please try again soon.';
        _isError = true;
      });
    }
  }

  String? _validateEmail(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(trimmed)) {
      return 'Enter a valid email';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (widget.icon != null)
                    Container(
                      height: 44,
                      width: 44,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(widget.icon, color: theme.colorScheme.primary),
                    ),
                  if (widget.icon != null) const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                widget.description,
                style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email address',
                  hintText: 'you@example.com',
                ),
                validator: _validateEmail,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : Text(widget.ctaLabel),
                ),
              ),
              if (_statusMessage != null) ...[
                const SizedBox(height: 12),
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 250),
                  opacity: _statusMessage == null ? 0 : 1,
                  child: Text(
                    _statusMessage!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _isError
                          ? theme.colorScheme.error
                          : theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
