using System.ComponentModel.DataAnnotations.Schema;

namespace blog_csharp.Models;

public class PostTag
{
    public string PostId { get; set; } = string.Empty;

    [ForeignKey(nameof(PostId))]
    public Post? Post { get; set; }

    public string TagId { get; set; } = string.Empty;

    [ForeignKey(nameof(TagId))]
    public Tag? Tag { get; set; }
}
