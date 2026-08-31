using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class AiLearningActivity
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("Student")]
        public int StudentId { get; set; }
        public Student Student { get; set; }

        public string Prompt { get; set; }
        public string AiResponse { get; set; }

        public string Topic { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
