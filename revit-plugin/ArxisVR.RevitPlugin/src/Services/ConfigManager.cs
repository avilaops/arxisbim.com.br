namespace ArxisVR.RevitPlugin.Services;

using System.IO;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using ArxisVR.RevitPlugin.Utils;

/// <summary>
/// Persists plugin configuration to %APPDATA%\ArxisVR\arxisvr-config.json.
/// The API key is encrypted with DPAPI (CurrentUser scope) so it never
/// touches disk in plain text.
/// </summary>
public class ConfigManager
{
    private static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ArxisVR");

    private static readonly string ConfigPath = Path.Combine(ConfigDir, Constants.ConfigFileName);

    public class PluginConfig
    {
        public string ApiBaseUrl { get; set; } = Constants.DefaultApiBaseUrl;
        public string EncryptedApiKey { get; set; } = "";
        public string DefaultLOD { get; set; } = Constants.DefaultLOD;
        public bool ValidateBeforeUpload { get; set; } = true;
    }

    public static PluginConfig Load()
    {
        try
        {
            if (!File.Exists(ConfigPath))
                return new PluginConfig();

            var json = File.ReadAllText(ConfigPath);
            return JsonConvert.DeserializeObject<PluginConfig>(json) ?? new PluginConfig();
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Failed to load config, using defaults");
            return new PluginConfig();
        }
    }

    public static void Save(PluginConfig config)
    {
        Directory.CreateDirectory(ConfigDir);
        File.WriteAllText(ConfigPath, JsonConvert.SerializeObject(config, Formatting.Indented));
        Logger.Info("Config saved to {0}", ConfigPath);
    }

    public static void SetApiKey(PluginConfig config, string apiKey)
    {
        var bytes = Encoding.UTF8.GetBytes(apiKey);
        var encrypted = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
        config.EncryptedApiKey = Convert.ToBase64String(encrypted);
    }

    public static string? GetApiKey(PluginConfig config)
    {
        if (string.IsNullOrEmpty(config.EncryptedApiKey))
            return null;

        try
        {
            var encrypted = Convert.FromBase64String(config.EncryptedApiKey);
            var bytes = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(bytes);
        }
        catch (CryptographicException ex)
        {
            Logger.Error(ex, "Failed to decrypt API key (different user/machine?)");
            return null;
        }
    }
}
