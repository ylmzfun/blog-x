package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.dto.CreateTagRequest;
import fun.ylmz.blogspringboot.model.vo.PostVO;
import fun.ylmz.blogspringboot.model.vo.TagVO;
import fun.ylmz.blogspringboot.service.PostService;
import fun.ylmz.blogspringboot.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;
    private final PostService postService;

    @GetMapping
    public Result<List<TagVO>> list() {
        return Result.success(tagService.list());
    }

    @GetMapping("/{slug}/posts")
    public Result<PageResult<PostVO>> posts(
            @PathVariable String slug,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Page<PostVO> result = postService.listByTag(slug, page, pageSize);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @PostMapping
    public Result<TagVO> create(@Valid @RequestBody CreateTagRequest request) {
        return Result.success(tagService.create(request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        tagService.delete(id);
        return Result.success();
    }
}
