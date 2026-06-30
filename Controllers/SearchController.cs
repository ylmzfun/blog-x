using Microsoft.AspNetCore.Mvc;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly SearchService _searchService;

    public SearchController(SearchService searchService) => _searchService = searchService;

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { code = 400, message = "Query parameter 'q' is required" });

        var result = await _searchService.SearchAsync(q, page, pageSize);
        return Ok(result);
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> Suggestions([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new { code = 0, message = "success", data = new { suggestions = Array.Empty<string>() } });

        var result = await _searchService.SuggestionsAsync(q);
        return Ok(result);
    }
}
