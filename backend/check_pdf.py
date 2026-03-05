from pypdf import PdfReader

reader = PdfReader("test_output.pdf")
text = reader.pages[0].extract_text()
print("Extracted Text:")
print(repr(text))
if "₹" in text:
    print("SUCCESS: Rupee symbol found in PDF text layer.")
else:
    print("FAILURE: Rupee symbol NOT found in PDF text layer.")
