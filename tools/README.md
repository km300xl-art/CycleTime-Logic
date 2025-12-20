# Excel → JSON refresh workflow

The source Excel workbook must **stay private** in `CycleTime-Logic-Private/reference/*.xlsm`. When the spreadsheet changes, refresh the extracted JSON locally and copy it into this public repo.

1) From the private repo, regenerate the JSON extracts from the workbook:

```bash
# In CycleTime-Logic-Private
npm run extract:excel -- --source reference/CT_FINAL_logic.xlsm --out ../CycleTime-Logic/src/data/excel
```

The exact script name/flags may differ in the private tooling, but the goal is to emit the same folder layout that lives under `src/data/excel/` in this repo.

2) Copy the refreshed JSON into this repo and validate it:

```bash
# From the public repo root (CycleTime-Logic)
rsync -av ../CycleTime-Logic-Private/src/data/excel/ src/data/excel/
npm run validate:excel-json
```

3) Commit **only** the JSON files. Never commit the `.xlsm` workbook or any other binary extracts into this repo.
