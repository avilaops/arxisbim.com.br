namespace ArxisVR.RevitPlugin.Services;

using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using ArxisVR.RevitPlugin.Models;

/// <summary>
/// HTTP client for ArxisVR API communication
/// </summary>
public class ArxisVRClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly string _apiBaseUrl;
    private readonly string _apiKey;

    public ArxisVRClient(string apiBaseUrl, string apiKey)
    {
        _apiBaseUrl = apiBaseUrl.TrimEnd('/');
        _apiKey = apiKey;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ArxisVR-Revit-Plugin/1.0");
    }

    /// <summary>
    /// Upload IFC file and start export process
    /// </summary>
    public async Task<ExportResult> UploadIFCAsync(
        string filePath,
        ExportConfig config,
        IProgress<long>? uploadProgress = null)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"File not found: {filePath}");
            }

            var fileInfo = new FileInfo(filePath);
            Logger.Info("Starting upload: {0} ({1} MB)", Path.GetFileName(filePath), fileInfo.Length / 1024 / 1024);

            using (var form = new MultipartFormDataContent())
            {
                // Add file
                using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
                {
                    var fileContent = new StreamContent(fileStream);
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
                    form.Add(fileContent, "file", Path.GetFileName(filePath));

                    // Add config
                    form.Add(new StringContent(config.ProjectName), "projectName");
                    form.Add(new StringContent(config.Description ?? ""), "description");
                    form.Add(new StringContent(config.LOD), "lod");
                    form.Add(new StringContent(config.IncludeStructure.ToString()), "includeStructure");
                    form.Add(new StringContent(config.IncludeArchitecture.ToString()), "includeArchitecture");
                    form.Add(new StringContent(config.IncludeMEP.ToString()), "includeMEP");

                    // Upload
                    var url = $"{_apiBaseUrl}/api/v1/plugin/exports";
                    var response = await _httpClient.PostAsync(url, form);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        Logger.Error("Upload failed: {0} - {1}", response.StatusCode, errorContent);
                        return new ExportResult
                        {
                            Status = "failed",
                            ErrorMessage = $"Upload failed with status {response.StatusCode}"
                        };
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonConvert.DeserializeObject<ExportResult>(responseContent);
                    Logger.Info("Upload successful: {0}", result?.ExportId);
                    return result ?? new ExportResult { Status = "failed" };
                }
            }
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Upload error: {0}", ex.Message);
            throw;
        }
    }

    /// <summary>
    /// Get export status by ID
    /// </summary>
    public async Task<ExportResult> GetExportStatusAsync(string exportId)
    {
        try
        {
            var url = $"{_apiBaseUrl}/api/v1/plugin/exports/{exportId}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                Logger.Warning("Get status failed: {0}", response.StatusCode);
                return new ExportResult { Status = "failed" };
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ExportResult>(content);
            return result ?? new ExportResult { Status = "unknown" };
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Get status error: {0}", ex.Message);
            throw;
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}
