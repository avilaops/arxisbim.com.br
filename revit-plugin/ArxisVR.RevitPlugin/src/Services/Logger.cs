namespace ArxisVR.RevitPlugin.Services;

using Serilog;
using System.IO;

/// <summary>
/// Centralized logging service for the plugin.
/// Writes to %APPDATA%\ArxisVR\logs\plugin-.log (rolling daily) —
/// Revit has no console, so file sink is the only reliable output.
/// </summary>
public static class Logger
{
    private static ILogger? _logger;
    private static readonly object _lock = new();

    public static void Initialize()
    {
        if (_logger != null) return;

        lock (_lock)
        {
            if (_logger != null) return;

            var logDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "ArxisVR", "logs");
            Directory.CreateDirectory(logDir);

            _logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.File(
                    Path.Combine(logDir, "plugin-.log"),
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 14)
                .CreateLogger();
        }
    }

    public static void Info(string messageTemplate, params object?[] propertyValues)
        => _logger?.Information(messageTemplate, propertyValues);

    public static void Warning(string messageTemplate, params object?[] propertyValues)
        => _logger?.Warning(messageTemplate, propertyValues);

    public static void Error(string messageTemplate, params object?[] propertyValues)
        => _logger?.Error(messageTemplate, propertyValues);

    public static void Error(Exception ex, string messageTemplate, params object?[] propertyValues)
        => _logger?.Error(ex, messageTemplate, propertyValues);

    public static void Debug(string messageTemplate, params object?[] propertyValues)
        => _logger?.Debug(messageTemplate, propertyValues);
}
