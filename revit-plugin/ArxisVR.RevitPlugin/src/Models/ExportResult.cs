namespace ArxisVR.RevitPlugin.Models;

/// <summary>
/// Result from an export operation
/// </summary>
public class ExportResult
{
    public string ExportId { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string? Message { get; set; }
    public string? ProjectUrl { get; set; }
    public string? ShareLink { get; set; }
    public string? ErrorMessage { get; set; }
    public bool IsSuccess => Status == "completed";
}
