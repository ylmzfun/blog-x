using System.Net.Http.Json;
using Microsoft.AspNetCore.Components.Authorization;
using System.Security.Claims;
using blog_csharp.DTOs;

namespace blog_csharp.Services;

public class BlogAuthStateProvider : AuthenticationStateProvider
{
    private readonly ILocalStorage _localStorage;
    private readonly HttpClient _http;

    public BlogAuthStateProvider(ILocalStorage localStorage, HttpClient http)
    {
        _localStorage = localStorage;
        _http = http;
    }

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var token = await _localStorage.GetItemAsync("accessToken");

        if (string.IsNullOrEmpty(token))
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));

        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var identity = new ClaimsIdentity(ParseClaimsFromJwt(token), "jwt");
        return new AuthenticationState(new ClaimsPrincipal(identity));
    }

    public async Task SetTokenAsync(string accessToken, string refreshToken)
    {
        await _localStorage.SetItemAsync("accessToken", accessToken);
        await _localStorage.SetItemAsync("refreshToken", refreshToken);
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task ClearTokenAsync()
    {
        await _localStorage.RemoveItemAsync("accessToken");
        await _localStorage.RemoveItemAsync("refreshToken");
        _http.DefaultRequestHeaders.Authorization = null;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    private static IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
    {
        var payload = jwt.Split('.')[1];
        var jsonBytes = ParseBase64WithoutPadding(payload);
        var kvp = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(jsonBytes);

        var claims = new List<Claim>();
        if (kvp != null)
        {
            if (kvp.TryGetValue(ClaimTypes.NameIdentifier, out var sub) && sub != null)
                claims.Add(new Claim(ClaimTypes.NameIdentifier, sub.ToString()!));
            if (kvp.TryGetValue(ClaimTypes.Name, out var name) && name != null)
                claims.Add(new Claim(ClaimTypes.Name, name.ToString()!));
            if (kvp.TryGetValue("email", out var email) && email != null)
                claims.Add(new Claim(ClaimTypes.Email, email.ToString()!));
            if (kvp.TryGetValue(ClaimTypes.Role, out var role) && role != null)
                claims.Add(new Claim(ClaimTypes.Role, role.ToString()!));
        }

        return claims;
    }

    private static byte[] ParseBase64WithoutPadding(string base64)
    {
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }
        return Convert.FromBase64String(base64);
    }
}

public interface ILocalStorage
{
    Task<string?> GetItemAsync(string key);
    Task SetItemAsync(string key, string value);
    Task RemoveItemAsync(string key);
}

public class LocalStorage : ILocalStorage
{
    public Task<string?> GetItemAsync(string key)
    {
        return Task.FromResult((string?)null);
    }

    public Task SetItemAsync(string key, string value)
    {
        return Task.CompletedTask;
    }

    public Task RemoveItemAsync(string key)
    {
        return Task.CompletedTask;
    }
}
