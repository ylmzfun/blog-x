package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.vo.SearchResultVO;
import fun.ylmz.blogspringboot.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public Result<PageResult<SearchResultVO>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Page<SearchResultVO> result = searchService.search(q, page, pageSize);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @GetMapping("/suggestions")
    public Result<List<String>> suggestions(@RequestParam String q) {
        return Result.success(searchService.suggestions(q));
    }
}
