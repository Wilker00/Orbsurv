import 'package:flutter_test/flutter_test.dart';
import 'package:orbsurv_mobile/app.dart';

void main() {
  testWidgets('renders Orbsurv home experience', (tester) async {
    await tester.pumpWidget(const OrbsurvApp());
    await tester.pumpAndSettle();

    expect(find.text('Orbsurv'), findsWidgets);
    expect(find.text('Join early interest'), findsOneWidget);
  });
}
