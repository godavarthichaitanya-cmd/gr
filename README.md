# zgr.controls - GR/GI Controls (SAPUI5 freestyle, mobile-first, 3 screens)

Run: `npm i && npm start`   (phone / camera / scanner need HTTPS: `npm run start:https`)

Screens
1. OpenControl  - GI/GR radio, Truck No (value help + pencil), Truck Seal (scan), Warehouse Number,
                  Language dropdown (E = English, S = Slovenian, switches the UI at runtime)
2. Inspect      - ONE view, 3 panels:
                  1 Scan Label & Verify  (capture, OCR fields, Good/Bad, sensor serial, Confirm & Validate)
                  2 Checklist            (locked until BAD is chosen)
                  3 Deviation Capture    (opens when validation errors / flagged checklist answers)
                  Each committed item is added to the control; scan as many as needed.
4. Summary      - context, scanned items, checklist, deviations, close batch manually, Submit Control

Demo: GR > truck RT-310-ZZ > any seal > warehouse 1000 > Continue
      Inbound delivery 80001234 > Capture (any image) > Good > Confirm & Validate  (qty 40/60 -> item added)
      Repeat with Bad > checklist > answer "Packaging intact" = No > deviation panel opens.

Swap mocks (webapp/service): OcrService, ValidationService (RAP validateControl), SubmissionService (RAP create).
Texts: webapp/i18n/i18n_en.properties and i18n_sl.properties (keep keys identical).
