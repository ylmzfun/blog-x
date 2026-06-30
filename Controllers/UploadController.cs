using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.DTOs;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/upload")]
public class UploadController : ControllerBase
{
    private readonly IConfiguration _config;

    public UploadController(IConfiguration config) => _config = config;

    [HttpPost("image")]
    [Authorize]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        return await Upload(file, "images");
    }

    [HttpPost("avatar")]
    [Authorize]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        return await Upload(file, "avatars");
    }

    private async Task<IActionResult> Upload(IFormFile file, string subfolder)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new ApiResponse<object> { Code = 400, Message = "No file provided" });

        var maxSize = _config.GetValue<long>("Upload:MaxFileSize", 5 * 1024 * 1024);
        if (file.Length > maxSize)
            return BadRequest(new ApiResponse<object> { Code = 400, Message = "File too large" });

        var uploadPath = Path.Combine(
            _config["Upload:Path"] ?? "wwwroot/uploads", subfolder);
        Directory.CreateDirectory(uploadPath);

        var ext = Path.GetExtension(file.FileName);
        var filename = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadPath, filename);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var url = $"/uploads/{subfolder}/{filename}";
        return Ok(new ApiResponse<UploadResponse>
        {
            Data = new UploadResponse(url, filename)
        });
    }
}
