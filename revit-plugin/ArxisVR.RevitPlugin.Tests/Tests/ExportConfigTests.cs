namespace ArxisVR.RevitPlugin.Tests;

using ArxisVR.RevitPlugin.Models;
using Newtonsoft.Json;

public class ExportConfigTests
{
    [Test]
    public void Defaults_AreSensible()
    {
        var config = new ExportConfig();

        Assert.Multiple(() =>
        {
            Assert.That(config.LOD, Is.EqualTo("LOD 300"));
            Assert.That(config.IncludeStructure, Is.True);
            Assert.That(config.IncludeArchitecture, Is.True);
            Assert.That(config.IncludeMEP, Is.False);
            Assert.That(config.ValidateBeforeUpload, Is.True);
        });
    }

    [Test]
    public void SerializesToJson_RoundTrips()
    {
        var config = new ExportConfig
        {
            ProjectName = "Torre Norte",
            Description = "Cenário A — fachada ventilada",
            LOD = "LOD 350",
            IncludeMEP = true,
        };

        var json = JsonConvert.SerializeObject(config);
        var restored = JsonConvert.DeserializeObject<ExportConfig>(json);

        Assert.That(restored, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(restored!.ProjectName, Is.EqualTo("Torre Norte"));
            Assert.That(restored.LOD, Is.EqualTo("LOD 350"));
            Assert.That(restored.IncludeMEP, Is.True);
        });
    }
}

public class ExportResultTests
{
    [Test]
    public void IsSuccess_OnlyWhenCompleted()
    {
        Assert.Multiple(() =>
        {
            Assert.That(new ExportResult { Status = "completed" }.IsSuccess, Is.True);
            Assert.That(new ExportResult { Status = "pending" }.IsSuccess, Is.False);
            Assert.That(new ExportResult { Status = "failed" }.IsSuccess, Is.False);
        });
    }

    [Test]
    public void DeserializesBackendResponse()
    {
        const string json = """
        {
            "exportId": "exp_123",
            "status": "processing",
            "shareLink": "https://arxisvr.avilaops.com/s/abc"
        }
        """;

        var result = JsonConvert.DeserializeObject<ExportResult>(json);

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.ExportId, Is.EqualTo("exp_123"));
            Assert.That(result.Status, Is.EqualTo("processing"));
            Assert.That(result.ShareLink, Is.EqualTo("https://arxisvr.avilaops.com/s/abc"));
        });
    }
}
