package fun.ylmz.blogspringboot.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatsOverviewVO {
    private long postCount;
    private long commentCount;
    private long userCount;
    private long todayPV;
    private long todayUV;
}
