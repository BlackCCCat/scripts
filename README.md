# Scripting App Scripts

A curated collection of scripts for the **[Scripting app](https://scripting.fun/)**. Each directory is a ready-to-import script project that can run natively on iPhone and iPad.

## Available Scripts

| Script | Description | Import |
| --- | --- | --- |
| [Video to Live Photo](./Video%20to%20Live%20Photo) | Choose a video from Photos, adjust the cover moment and duration, then create and save a Live Photo directly to your library. The interface automatically follows the device language (English or Chinese). | [Import](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FScriptingApp%2Fscripts%2Ftree%2Fmain%2FVideo%20to%20Live%20Photo%22%5D) |
| [Apply Scripting TestFlight](./Apply%20Scripting%20TestFlight) | Apply for Scripting TestFlight access with a purchase receipt, Scripting Pro status screenshot, and App Store five-star review screenshot. Receipt OCR extracts the Apple ID email and order number, then opens a prefilled Mail draft with all three screenshots attached. The interface supports Chinese and English, with English as the fallback. | [Import](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FScriptingApp%2Fscripts%2Ftree%2Fmain%2FApply%20Scripting%20TestFlight%22%5D) |

## Importing Scripts

Use an **Import** link in the table above to open the script in Scripting. You can also import any script directory manually:

1. Open [Import Scripts](https://scripting.fun/import_scripts).
2. Paste a GitHub directory URL, for example:
   ```text
   https://github.com/ScriptingApp/scripts/tree/main/Video%20to%20Live%20Photo
   ```
3. Generate the import link, open it in Scripting, and confirm the import.

## Contributing

Each script is a self-contained directory with at least:

```text
Script Name/
├── script.json   # Script metadata
└── index.tsx     # Main entry point
```

Keep scripts self-contained, use Scripting APIs only where practical, and include user-facing documentation or a concise in-app workflow.

## License

MIT
