namespace ArxisVR.RevitPlugin.Commands;

using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using ArxisVR.RevitPlugin.Dialogs;
using ArxisVR.RevitPlugin.Services;
using System.IO;

/// <summary>
/// "Export to ArxisVR" ribbon button.
/// Flow: config dialog → IFC export → upload → shareable link.
/// </summary>
[Transaction(TransactionMode.Manual)]
[Regeneration(RegenerationOption.Manual)]
public class ExportCommand : IExternalCommand
{
    public Result Execute(
        ExternalCommandData commandData,
        ref string message,
        ElementSet elements)
    {
        Logger.Initialize();

        var uiDoc = commandData.Application.ActiveUIDocument;
        if (uiDoc == null)
        {
            message = "Nenhum documento aberto.";
            return Result.Cancelled;
        }

        var doc = uiDoc.Document;
        Logger.Info("Export command started for document: {0}", doc.Title);

        // 1. Verificar configuração da API
        var config = ConfigManager.Load();
        var apiKey = ConfigManager.GetApiKey(config);
        if (string.IsNullOrEmpty(apiKey))
        {
            var td = new TaskDialog("ArxisVR")
            {
                MainInstruction = "API key não configurada",
                MainContent = "Configure sua API key do ArxisVR em ArxisVR → Settings antes de exportar.\n\n" +
                              "Você encontra a key em arxisvr.avilaops.com → Conta → API Tokens.",
                CommonButtons = TaskDialogCommonButtons.Ok
            };
            td.Show();
            return Result.Cancelled;
        }

        // 2. Dialog de configuração do export
        var defaultName = string.IsNullOrEmpty(doc.PathName)
            ? doc.Title
            : Path.GetFileNameWithoutExtension(doc.PathName);

        var dialog = new ExportDialog(defaultName);
        if (dialog.ShowDialog() != true || dialog.Config == null)
        {
            Logger.Info("Export cancelled by user");
            return Result.Cancelled;
        }

        var exportConfig = dialog.Config;

        try
        {
            // 3. Exportar IFC (thread da API do Revit — síncrono por design)
            var exporter = new IFCExporter(doc, exportConfig);
            var ifcPath = exporter.Export();

            // 4. Upload (bloqueante com feedback; async real chega com a ProgressDialog)
            using var client = new ArxisVRClient(config.ApiBaseUrl, apiKey);
            var result = client.UploadIFCAsync(ifcPath, exportConfig)
                .GetAwaiter().GetResult();

            // 5. Resultado
            if (result.Status is "completed" or "pending" or "processing")
            {
                var success = new TaskDialog("ArxisVR")
                {
                    MainInstruction = "Modelo enviado com sucesso!",
                    MainContent = $"Projeto: {exportConfig.ProjectName}\n" +
                                  $"Status: {result.Status}\n\n" +
                                  (string.IsNullOrEmpty(result.ShareLink)
                                      ? "O processamento continua no servidor — acompanhe no dashboard."
                                      : $"Link: {result.ShareLink}"),
                    CommonButtons = TaskDialogCommonButtons.Close
                };

                if (!string.IsNullOrEmpty(result.ShareLink))
                {
                    success.AddCommandLink(TaskDialogCommandLinkId.CommandLink1, "Copiar link");
                    success.AddCommandLink(TaskDialogCommandLinkId.CommandLink2, "Abrir no navegador");
                }

                var choice = success.Show();
                if (choice == TaskDialogResult.CommandLink1 && !string.IsNullOrEmpty(result.ShareLink))
                {
                    System.Windows.Clipboard.SetText(result.ShareLink);
                }
                else if (choice == TaskDialogResult.CommandLink2 && !string.IsNullOrEmpty(result.ShareLink))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(result.ShareLink)
                    {
                        UseShellExecute = true
                    });
                }

                return Result.Succeeded;
            }

            message = result.ErrorMessage ?? "Falha no upload.";
            Logger.Error("Upload failed: {0}", message);
            TaskDialog.Show("ArxisVR", $"Falha no envio:\n{message}");
            return Result.Failed;
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Export command failed");
            message = ex.Message;
            TaskDialog.Show("ArxisVR", $"Erro durante o export:\n{ex.Message}");
            return Result.Failed;
        }
    }
}
