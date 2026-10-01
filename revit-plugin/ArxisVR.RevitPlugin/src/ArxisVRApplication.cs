namespace ArxisVR.RevitPlugin;

using Autodesk.Revit.UI;
using ArxisVR.RevitPlugin.Services;
using System.Reflection;

/// <summary>
/// Plugin entry point. Creates the "ArxisVR" ribbon tab with
/// Export and Validate buttons when Revit starts.
/// </summary>
public class ArxisVRApplication : IExternalApplication
{
    private const string TabName = "ArxisVR";
    private const string PanelName = "Tools";

    public Result OnStartup(UIControlledApplication application)
    {
        Logger.Initialize();
        Logger.Info("ArxisVR plugin starting (Revit {0})", application.ControlledApplication.VersionNumber);

        try
        {
            application.CreateRibbonTab(TabName);
        }
        catch (Autodesk.Revit.Exceptions.ArgumentException)
        {
            // Tab already exists (e.g. hot-reload during development) — safe to continue.
        }

        var panel = application.CreateRibbonPanel(TabName, PanelName);
        var assemblyPath = Assembly.GetExecutingAssembly().Location;

        var exportButton = new PushButtonData(
            "ArxisVR_Export",
            "Export to\nArxisVR",
            assemblyPath,
            "ArxisVR.RevitPlugin.Commands.ExportCommand")
        {
            ToolTip = "Export the active model to ArxisVR (under 2 minutes)",
            LongDescription = "Exports the model as optimized IFC and uploads it to the ArxisVR platform. " +
                              "A shareable link is generated when processing completes."
        };

        var validateButton = new PushButtonData(
            "ArxisVR_Validate",
            "Validate\nIFC",
            assemblyPath,
            "ArxisVR.RevitPlugin.Commands.ValidateCommand")
        {
            ToolTip = "Validate the model before export",
            LongDescription = "Runs pre-export checks: duplicate GUIDs, orphan elements, " +
                              "missing property sets and inconsistent units."
        };

        var settingsButton = new PushButtonData(
            "ArxisVR_Settings",
            "Settings",
            assemblyPath,
            "ArxisVR.RevitPlugin.Commands.SettingsCommand")
        {
            ToolTip = "Configure ArxisVR API connection"
        };

        panel.AddItem(exportButton);
        panel.AddItem(validateButton);
        panel.AddItem(settingsButton);

        Logger.Info("Ribbon created: tab '{0}', panel '{1}'", TabName, PanelName);
        return Result.Succeeded;
    }

    public Result OnShutdown(UIControlledApplication application)
    {
        Logger.Info("ArxisVR plugin shutting down");
        return Result.Succeeded;
    }
}
