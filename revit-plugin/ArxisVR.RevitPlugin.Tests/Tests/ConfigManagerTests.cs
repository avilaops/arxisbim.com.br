namespace ArxisVR.RevitPlugin.Tests;

using ArxisVR.RevitPlugin.Services;

public class ConfigManagerTests
{
    [Test]
    public void ApiKey_EncryptsAndDecrypts_RoundTrip()
    {
        var config = new ConfigManager.PluginConfig();

        ConfigManager.SetApiKey(config, "arx_test_key_12345");

        Assert.Multiple(() =>
        {
            // Nunca em plain text
            Assert.That(config.EncryptedApiKey, Does.Not.Contain("arx_test_key_12345"));
            Assert.That(config.EncryptedApiKey, Is.Not.Empty);
        });

        var decrypted = ConfigManager.GetApiKey(config);
        Assert.That(decrypted, Is.EqualTo("arx_test_key_12345"));
    }

    [Test]
    public void GetApiKey_ReturnsNull_WhenNotSet()
    {
        var config = new ConfigManager.PluginConfig();
        Assert.That(ConfigManager.GetApiKey(config), Is.Null);
    }

    [Test]
    public void GetApiKey_ReturnsNull_WhenCorrupted()
    {
        var config = new ConfigManager.PluginConfig
        {
            EncryptedApiKey = Convert.ToBase64String(new byte[] { 1, 2, 3, 4 })
        };

        Assert.That(ConfigManager.GetApiKey(config), Is.Null);
    }
}
