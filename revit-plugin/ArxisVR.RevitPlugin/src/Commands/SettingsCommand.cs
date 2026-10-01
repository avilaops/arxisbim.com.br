namespace ArxisVR.RevitPlugin.Commands;

using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using ArxisVR.RevitPlugin.Dialogs;
using ArxisVR.RevitPlugin.Services;

/// <summary>
/// "Settings" ribbon button — configure API URL and API key.
/// </summary>
[Transaction(TransactionMode.Manual)]
[Regeneration(RegenerationOption.Manual)]
public class SettingsCommand : IExternalCommand
{
    public Result Execute(
        ExternalCommandData commandData,
        ref string message,
        ElementSet elements)
    {
        Logger.Initialize();

        var dialog = new SettingsDialog();
        dialog.ShowDialog();
        return Result.Succeeded;
    }
}
