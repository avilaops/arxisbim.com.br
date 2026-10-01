namespace ArxisVR.RevitPlugin.Dialogs;

using System.Windows;
using System.Windows.Controls;
using ArxisVR.RevitPlugin.Models;

/// <summary>
/// Export configuration dialog (code-only WPF — no XAML compilation needed).
/// Shows discipline checkboxes, LOD selector and project metadata fields.
/// </summary>
public class ExportDialog : Window
{
    public ExportConfig? Config { get; private set; }

    private readonly TextBox _projectName;
    private readonly TextBox _description;
    private readonly CheckBox _structure;
    private readonly CheckBox _architecture;
    private readonly CheckBox _mep;
    private readonly ComboBox _lod;
    private readonly CheckBox _validate;

    public ExportDialog(string defaultProjectName)
    {
        Title = "Export to ArxisVR";
        Width = 440;
        SizeToContent = SizeToContent.Height;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ResizeMode = ResizeMode.NoResize;

        var root = new StackPanel { Margin = new Thickness(16) };

        root.Children.Add(new TextBlock
        {
            Text = "Nome do projeto",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _projectName = new TextBox { Text = defaultProjectName, Margin = new Thickness(0, 0, 0, 12) };
        root.Children.Add(_projectName);

        root.Children.Add(new TextBlock
        {
            Text = "Descrição (opcional)",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _description = new TextBox
        {
            Height = 48,
            TextWrapping = TextWrapping.Wrap,
            AcceptsReturn = true,
            Margin = new Thickness(0, 0, 0, 12)
        };
        root.Children.Add(_description);

        root.Children.Add(new TextBlock
        {
            Text = "Disciplinas",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _structure = new CheckBox { Content = "Estrutura", IsChecked = true, Margin = new Thickness(0, 2, 0, 2) };
        _architecture = new CheckBox { Content = "Arquitetura", IsChecked = true, Margin = new Thickness(0, 2, 0, 2) };
        _mep = new CheckBox { Content = "MEP (instalações)", IsChecked = false, Margin = new Thickness(0, 2, 0, 12) };
        root.Children.Add(_structure);
        root.Children.Add(_architecture);
        root.Children.Add(_mep);

        root.Children.Add(new TextBlock
        {
            Text = "Nível de detalhe",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _lod = new ComboBox
        {
            ItemsSource = new[] { "LOD 200", "LOD 300", "LOD 350", "LOD 400" },
            SelectedIndex = 1,
            Margin = new Thickness(0, 0, 0, 12)
        };
        root.Children.Add(_lod);

        _validate = new CheckBox
        {
            Content = "Validar IFC antes do upload (recomendado)",
            IsChecked = true,
            Margin = new Thickness(0, 0, 0, 16)
        };
        root.Children.Add(_validate);

        var buttons = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right
        };

        var cancelBtn = new Button { Content = "Cancelar", Width = 90, Margin = new Thickness(0, 0, 8, 0) };
        cancelBtn.Click += (_, _) => { DialogResult = false; Close(); };

        var exportBtn = new Button { Content = "Exportar", Width = 110, IsDefault = true };
        exportBtn.Click += OnExportClick;

        buttons.Children.Add(cancelBtn);
        buttons.Children.Add(exportBtn);
        root.Children.Add(buttons);

        Content = root;
    }

    private void OnExportClick(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(_projectName.Text))
        {
            MessageBox.Show(this, "Informe o nome do projeto.", "Export to ArxisVR",
                MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (_structure.IsChecked != true && _architecture.IsChecked != true && _mep.IsChecked != true)
        {
            MessageBox.Show(this, "Selecione pelo menos uma disciplina.", "Export to ArxisVR",
                MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        Config = new ExportConfig
        {
            ProjectName = _projectName.Text.Trim(),
            Description = _description.Text.Trim(),
            LOD = _lod.SelectedItem?.ToString() ?? "LOD 300",
            IncludeStructure = _structure.IsChecked == true,
            IncludeArchitecture = _architecture.IsChecked == true,
            IncludeMEP = _mep.IsChecked == true,
            ValidateBeforeUpload = _validate.IsChecked == true,
        };

        DialogResult = true;
        Close();
    }
}
