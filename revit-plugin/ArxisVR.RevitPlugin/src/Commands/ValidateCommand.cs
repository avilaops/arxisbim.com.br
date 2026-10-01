namespace ArxisVR.RevitPlugin.Commands;

using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using ArxisVR.RevitPlugin.Models;
using ArxisVR.RevitPlugin.Services;

/// <summary>
/// "Validate IFC" ribbon button.
/// Exports the model to a temp IFC and runs local validation checks.
/// (Full validation engine arrives in Sprint 2 — for now, structural checks.)
/// </summary>
[Transaction(TransactionMode.Manual)]
[Regeneration(RegenerationOption.Manual)]
public class ValidateCommand : IExternalCommand
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
        Logger.Info("Validate command started for document: {0}", doc.Title);

        try
        {
            // Checagens pré-export direto no modelo Revit (rápidas, sem gerar IFC):
            var warnings = new List<string>();

            // 1. Documento salvo?
            if (string.IsNullOrEmpty(doc.PathName))
                warnings.Add("• O documento nunca foi salvo — salve antes de exportar.");

            // 2. Warnings do próprio Revit
            var revitWarnings = doc.GetWarnings();
            if (revitWarnings.Count > 0)
                warnings.Add($"• O modelo tem {revitWarnings.Count} warning(s) do Revit (Manage → Review Warnings).");

            // 3. Elementos de modelo presentes?
            var modelElements = new FilteredElementCollector(doc)
                .WhereElementIsNotElementType()
                .WhereElementIsViewIndependent()
                .Where(e => e.Category != null && e.Category.CategoryType == CategoryType.Model)
                .Count();

            if (modelElements == 0)
                warnings.Add("• Nenhum elemento de modelo encontrado — o IFC sairá vazio.");

            // 4. Níveis definidos?
            var levels = new FilteredElementCollector(doc).OfClass(typeof(Level)).Count();
            if (levels == 0)
                warnings.Add("• Nenhum nível (Level) definido — a hierarquia IFC ficará sem pavimentos.");

            var td = new TaskDialog("ArxisVR — Validação")
            {
                CommonButtons = TaskDialogCommonButtons.Close
            };

            if (warnings.Count == 0)
            {
                td.MainInstruction = "✓ Modelo pronto para export";
                td.MainContent = $"Elementos de modelo: {modelElements}\n" +
                                 $"Níveis: {levels}\n" +
                                 $"Warnings do Revit: {revitWarnings.Count}";
            }
            else
            {
                td.MainInstruction = $"{warnings.Count} ponto(s) de atenção";
                td.MainContent = string.Join("\n", warnings) +
                                 "\n\nVocê ainda pode exportar, mas revisar esses pontos melhora a qualidade do modelo no ArxisVR.";
            }

            td.Show();
            Logger.Info("Validation finished: {0} warnings", warnings.Count);
            return Result.Succeeded;
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Validate command failed");
            message = ex.Message;
            return Result.Failed;
        }
    }
}
