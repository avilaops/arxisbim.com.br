namespace ArxisVR.RevitPlugin.Services;

using Serilog;
using Serilog.Core;
using System;

/// <summary>
/// Centralized logging service for the plugin
/// </summary>
public static class Logger
{
    private static ILogger? _logger;

    public static void Initialize()
    {
        _logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console()
            .CreateLogger();
    }

    public static void Info(string messageTemplate, params object?[] propertyValues)
    {
        _logger?.Information(messageTemplate, propertyValues);
    }

    public static void Warning(string messageTemplate, params object?[] propertyValues)
    {
        _logger?.Warning(messageTemplate, propertyValues);
    }

    public static void Error(string messageTemplate, params object?[] propertyValues)
    {
        _logger?.Error(messageTemplate, propertyValues);
    }

    public static void Error(Exception ex, string messageTemplate, params object?[] propertyValues)
    {
        _logger?.Error(ex, messageTemplate, propertyValues);
    }

    public static void Debug(string messageTemplate, params object?[] propertyValues)
    {
        _logger?.Debug(messageTemplate, propertyValues);
    }
}
