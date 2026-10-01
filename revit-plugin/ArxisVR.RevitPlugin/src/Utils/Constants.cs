namespace ArxisVR.RevitPlugin.Utils;

/// <summary>
/// Global constants for the plugin
/// </summary>
public static class Constants
{
    public const string PluginName = "ArxisVR Export";
    public const string PluginVersion = "1.0.0";
    public const string PluginDescription = "Export Revit models to ArxisVR platform";

    // API configuration
    public const string DefaultApiBaseUrl = "https://api.arxisvr.avilaops.com";
    public const string ApiVersionPath = "/api/v1";

    // Config file locations
    public const string ConfigFileName = "arxisvr-config.json";

    // Timeouts
    public const int HttpTimeoutSeconds = 300; // 5 minutes for large uploads
    public const int ExportTimeoutMinutes = 10;

    // IFC export options
    public const string DefaultLOD = "LOD 300";
    public const int MaxFileSize = 500 * 1024 * 1024; // 500 MB
}
