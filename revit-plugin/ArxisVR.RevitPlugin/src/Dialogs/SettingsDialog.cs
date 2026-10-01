namespace ArxisVR.RevitPlugin.Dialogs;

using System.Windows;
using System.Windows.Controls;
using ArxisVR.RevitPlugin.Services;

/// <summary>
/// Settings dialog: API base URL + API key (stored encrypted via DPAPI).
/// </summary>
public class SettingsDialog : Window
{
    private readonly TextBox _apiUrl;
    private readonly PasswordBox _apiKey;
    private readonly TextBlock _keyStatus;

    public SettingsDialog()
    {
        Title = "ArxisVR — Settings";
        Width = 440;
        SizeToContent = SizeToContent.Height;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ResizeMode = ResizeMode.NoResize;

        var config = ConfigManager.Load();
        var hasKey = !string.IsNullOrEmpty(ConfigManager.GetApiKey(config));

        var root = new StackPanel { Margin = new Thickness(16) };

        root.Children.Add(new TextBlock
        {
            Text = "API URL",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _apiUrl = new TextBox { Text = config.ApiBaseUrl, Margin = new Thickness(0, 0, 0, 12) };
        root.Children.Add(_apiUrl);

        root.Children.Add(new TextBlock
        {
            Text = "API Key",
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 0, 0, 4)
        });
        _apiKey = new PasswordBox { Margin = new Thickness(0, 0, 0, 4) };
        root.Children.Add(_apiKey);

        _keyStatus = new TextBlock
        {
            Text = hasKey
                ? "✓ Uma API key já está configurada. Deixe em branco para mantê-la."
                : "Nenhuma API key configurada. Gere uma em arxisvr.avilaops.com → Conta → API Tokens.",
            FontSize = 11,
            Foreground = hasKey ? System.Windows.Media.Brushes.Green : System.Windows.Media.Brushes.Gray,
            TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 0, 0, 16)
        };
        root.Children.Add(_keyStatus);

        var buttons = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right
        };

        var cancelBtn = new Button { Content = "Cancelar", Width = 90, Margin = new Thickness(0, 0, 8, 0) };
        cancelBtn.Click += (_, _) => Close();

        var saveBtn = new Button { Content = "Salvar", Width = 110, IsDefault = true };
        saveBtn.Click += OnSaveClick;

        buttons.Children.Add(cancelBtn);
        buttons.Children.Add(saveBtn);
        root.Children.Add(buttons);

        Content = root;
    }

    private void OnSaveClick(object sender, RoutedEventArgs e)
    {
        var config = ConfigManager.Load();

        if (!Uri.TryCreate(_apiUrl.Text.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && uri.Scheme != "http"))
        {
            MessageBox.Show(this, "API URL inválida.", "Settings",
                MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        config.ApiBaseUrl = _apiUrl.Text.Trim().TrimEnd('/');

        if (!string.IsNullOrEmpty(_apiKey.Password))
            ConfigManager.SetApiKey(config, _apiKey.Password);

        ConfigManager.Save(config);
        Close();
    }
}
