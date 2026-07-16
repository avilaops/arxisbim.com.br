# ArxisVR Plugin for Revit 2027

Export Revit models to ArxisVR platform in under 2 minutes.

**Status:** 🚀 Development (Sprint 0 complete, Sprint 1 in progress)

---

## Quick Start

### Prerequisites

- **Revit 2027** installed
- **.NET 8.0 SDK** (check: `dotnet --version`)
- **Visual Studio 2022+** (C# workload)
- **Node.js 20.x** (for validator backend + Electron app)

### Installation

1. **Clone repository**
   ```powershell
   git clone https://github.com/AvilaOps/arxisvr.git
   cd revit-plugin
   ```

2. **Install Revit 2027 SDK** (optional, for development)
   - Download from: https://www.autodesk.com/developer-network/platform-technologies/revit
   - Extract and run installer
   - SDK will be installed to: `C:\Program Files\Autodesk\Revit 2027\AddIns\`

3. **Build plugin**
   ```powershell
   dotnet build ArxisVR.RevitPlugin.slnx --configuration Release
   ```

4. **Copy DLL to Revit AddIns folder**
   ```powershell
   $revitAddIns = "C:\Users\$env:USERNAME\AppData\Roaming\Autodesk\Revit\Addins\2027\"
   Copy-Item "ArxisVR.RevitPlugin\bin\Release\net8.0\ArxisVR.RevitPlugin.dll" -Destination $revitAddIns
   Copy-Item "ArxisVR.RevitPlugin\ArxisVR.addin" -Destination $revitAddIns
   ```

5. **Restart Revit** — plugin will appear in ribbon

---

## Project Structure

```
revit-plugin/
├── ArxisVR.RevitPlugin/
│   ├── src/
│   │   ├── Commands/           ← Ribbon button handlers
│   │   ├── Services/           ← Business logic (API, IFC export, etc.)
│   │   ├── Models/             ← Data models
│   │   ├── Dialogs/            ← WPF UI (coming soon)
│   │   └── Utils/              ← Constants, helpers
│   ├── Resources/              ← Icons, images
│   ├── ArxisVR.addin           ← Revit manifest
│   └── ArxisVR.RevitPlugin.csproj
├── ArxisVR.RevitPlugin.Tests/  ← Unit tests
├── validator-backend/          ← Node.js validation service
├── validator-app/              ← Electron desktop app
└── .github/workflows/          ← CI/CD (GitHub Actions)
```

---

## Development Workflow

### Build
```powershell
dotnet build ArxisVR.RevitPlugin.slnx
```

### Run Tests
```powershell
dotnet test ArxisVR.RevitPlugin.slnx
```

### Debug in Visual Studio
1. Open `ArxisVR.RevitPlugin.slnx`
2. Run → Attach to Process → `RevitCore.exe`
3. Set breakpoints in code

---

## Roadmap

### Sprint 0 ✅ Complete
- [x] Project scaffold (.NET 8.0)
- [x] NuGet dependencies
- [x] Revit manifest (.addin file)
- [x] Command stubs (Export, Validate)
- [x] Core services (Logger, API client)
- [x] First build successful

### Sprint 1 🔄 In Progress
- [ ] WPF Export Dialog
- [ ] IFC Exporter (Revit API)
- [ ] HTTP upload to ArxisVR backend
- [ ] Progress tracking
- [ ] Error handling

### Sprint 2
- [ ] Validator backend (Node.js)
- [ ] Electron app UI
- [ ] IFC validation checklist
- [ ] Auto-fix engine

### Sprint 3–6
- [ ] Asset Manager (component library)
- [ ] Bidirectional sync (costs, timeline)
- [ ] Clash detection
- [ ] Full testing + release

---

## Environment Variables

Create `.env` file in project root:

```env
# ArxisVR API
ARXISVR_API_URL=https://api.arxisvr.avilaops.com
ARXISVR_API_KEY=your_api_key_here

# Development
LOG_LEVEL=Debug
```

---

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests for new features
3. Ensure build passes: `dotnet build`
4. Ensure tests pass: `dotnet test`
5. Commit with clear message: `git commit -m "feat: add export dialog"`
6. Push and create PR

---

## Architecture

### Plugin (C#)
- **Ribbon UI:** Commands triggered by user clicks
- **Services:** API client, IFC exporter, configuration manager
- **Models:** Data structures shared with backend

### Validator (Node.js + Electron)
- **Backend:** IFC parsing + validation checks
- **UI:** Drag-and-drop validator app
- **Auto-fix:** Repair common IFC issues

### Backend Integration (Fastify)
- **POST /api/v1/exports:** Receive IFC files
- **WebSocket:** Real-time progress notifications
- **Database:** Track exports, validate results

---

## Troubleshooting

**Plugin doesn't appear in Revit ribbon?**
- Check: `C:\Users\{User}\AppData\Roaming\Autodesk\Revit\Addins\2027\ArxisVR.addin`
- Verify DLL is in same folder
- Restart Revit

**Build fails with "Autodesk namespace not found"?**
- Install Revit 2027 SDK
- Add Revit API references to `.csproj`

**Need API key?**
- Sign up at: https://arxisvr.avilaops.com
- Get key from account settings

---

## Support

- 📧 Email: support@avilaops.com
- 💬 GitHub Issues: https://github.com/AvilaOps/arxisvr/issues
- 📖 Docs: https://arxisvr.avilaops.com/docs

---

**Version:** 1.0.0-beta  
**Last Updated:** 16/07/2026  
**License:** MIT
