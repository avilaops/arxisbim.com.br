namespace ArxisVR.RevitPlugin.Services;

using Autodesk.Revit.DB;
using ArxisVR.RevitPlugin.Models;
using System.IO;

/// <summary>
/// Exports the active Revit document to IFC using the built-in exporter,
/// with view filtering according to the export configuration.
/// </summary>
public class IFCExporter
{
    private readonly Document _document;
    private readonly ExportConfig _config;

    public IFCExporter(Document document, ExportConfig config)
    {
        _document = document;
        _config = config;
    }

    /// <summary>
    /// Runs the IFC export synchronously (must be called on the Revit API thread)
    /// and returns the path of the generated .ifc file.
    /// </summary>
    public string Export(IProgress<string>? progress = null)
    {
        progress?.Report("Preparando export IFC...");

        var outputDir = Path.Combine(Path.GetTempPath(), "ArxisVR");
        Directory.CreateDirectory(outputDir);

        var safeName = SanitizeFileName(_config.ProjectName);
        var fileName = $"{safeName}_{DateTime.Now:yyyyMMdd_HHmmss}.ifc";
        var outputPath = Path.Combine(outputDir, fileName);

        var options = BuildExportOptions();

        progress?.Report("Exportando IFC (isso pode levar alguns minutos)...");
        Logger.Info("IFC export started: {0} -> {1}", _document.Title, outputPath);

        // Document.Export precisa rodar dentro de uma Transaction no Revit 2027
        using (var tx = new Transaction(_document, "ArxisVR IFC Export"))
        {
            tx.Start();
            _document.Export(outputDir, fileName, options);
            tx.Commit();
        }

        if (!File.Exists(outputPath))
            throw new InvalidOperationException($"IFC export finished but file was not created: {outputPath}");

        var sizeMb = new FileInfo(outputPath).Length / 1024.0 / 1024.0;
        Logger.Info("IFC export completed: {0:F1} MB", sizeMb);

        if (new FileInfo(outputPath).Length > Utils.Constants.MaxFileSize)
            throw new InvalidOperationException(
                $"Exported IFC is {sizeMb:F0} MB — exceeds the 500 MB upload limit. " +
                "Reduce scope (disciplines/LOD) and try again.");

        progress?.Report($"IFC gerado ({sizeMb:F1} MB)");
        return outputPath;
    }

    private IFCExportOptions BuildExportOptions()
    {
        var options = new IFCExportOptions
        {
            FileVersion = IFCVersion.IFC4,
            ExportBaseQuantities = true,
            WallAndColumnSplitting = false,
        };

        // Site placement / coordenadas compartilhadas
        if (_config.IncludeCoordinates)
            options.AddOption("SitePlacement", "Shared");

        // Property sets — essenciais para a cadeia de metadados do ArxisVR
        options.AddOption("ExportInternalRevitPropertySets", "true");
        options.AddOption("ExportIFCCommonPropertySets", "true");
        options.AddOption("ExportSchedulesAsPsets", "true");

        // Nível de detalhe da tesselação conforme LOD escolhido
        options.AddOption("TessellationLevelOfDetail", _config.LOD switch
        {
            "LOD 200" => "0.25",
            "LOD 300" => "0.5",
            "LOD 350" => "0.75",
            "LOD 400" => "1",
            _ => "0.5",
        });

        return options;
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray()).Trim();
        return string.IsNullOrEmpty(sanitized) ? "modelo" : sanitized;
    }
}
