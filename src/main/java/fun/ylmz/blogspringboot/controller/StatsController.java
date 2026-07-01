package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.vo.PostVO;
import fun.ylmz.blogspringboot.model.vo.StatsOverviewVO;
import fun.ylmz.blogspringboot.service.PostService;
import fun.ylmz.blogspringboot.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;
    private final PostService postService;

    @GetMapping("/overview")
    public Result<StatsOverviewVO> overview() {
        return Result.success(statsService.overview());
    }

    @GetMapping("/posts/top")
    public Result<List<PostVO>> topPosts() {
        return Result.success(postService.topPosts());
    }
}
