package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.dto.CreateCategoryRequest;
import fun.ylmz.blogspringboot.model.vo.CategoryVO;
import fun.ylmz.blogspringboot.model.vo.PostVO;
import fun.ylmz.blogspringboot.service.CategoryService;
import fun.ylmz.blogspringboot.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final PostService postService;

    @GetMapping
    public Result<List<CategoryVO>> list() {
        return Result.success(categoryService.list());
    }

    @GetMapping("/{slug}")
    public Result<CategoryVO> detail(@PathVariable String slug) {
        return Result.success(categoryService.getBySlug(slug));
    }

    @GetMapping("/{slug}/posts")
    public Result<PageResult<PostVO>> posts(
            @PathVariable String slug,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Page<PostVO> result = postService.listByCategory(slug, page, pageSize);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @PostMapping
    public Result<CategoryVO> create(@Valid @RequestBody CreateCategoryRequest request) {
        return Result.success(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public Result<CategoryVO> update(@PathVariable Long id,
                                     @Valid @RequestBody CreateCategoryRequest request) {
        return Result.success(categoryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return Result.success();
    }
}
