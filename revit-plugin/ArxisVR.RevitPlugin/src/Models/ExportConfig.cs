namespace ArxisVR.RevitPlugin.Models;

/// <summary>
/// Configuration for IFC export to ArxisVR
/// </summary>
public class ExportConfig
{
    /// <summary>
    /// Project name (will be used as model name in ArxisVR)
    /// </summary>
    public string ProjectName { get; set; } = "";

    /// <summary>
    /// Optional description for the model
    /// </summary>
    public string Description { get; set; } = "";

    /// <summary>
    /// Level of Detail: "LOD 200", "LOD 300", "LOD 350", "LOD 400"
    /// </summary>
    public string LOD { get; set; } = "LOD 300";

    /// <summary>
    /// Include structural elements (columns, beams, foundations)
    /// </summary>
    public bool IncludeStructure { get; set; } = true;

    /// <summary>
    /// Include architectural elements (walls, floors, roofs, doors, windows)
    /// </summary>
    public bool IncludeArchitecture { get; set; } = true;

    /// <summary>
    /// Include MEP (mechanical, electrical, plumbing) elements
    /// </summary>
    public bool IncludeMEP { get; set; } = false;

    /// <summary>
    /// Include coordinate system and shared coordinates
    /// </summary>
    public bool IncludeCoordinates { get; set; } = true;

    /// <summary>
    /// Validate IFC before upload
    /// </summary>
    public bool ValidateBeforeUpload { get; set; } = true;
}
