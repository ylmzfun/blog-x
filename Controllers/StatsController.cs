using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/stats")]
[Authorize(Roles = "admin")]
public class StatsController : ControllerBase
{
    private readonly StatsService _statsService;

    public StatsController(StatsService statsService) => _statsService = statsService;

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var result = await _statsService.GetOverviewAsync();
        return Ok(result);
    }

    [HttpGet("posts/top")]
    public async Task<IActionResult> GetTopPosts()
    {
        var result = await _statsService.GetTopPostsAsync();
        return Ok(result);
    }
}
