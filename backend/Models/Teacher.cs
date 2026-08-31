using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class Teacher
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public string Bio { get; set; }
        public string Specialization { get; set; }

        public int YearsOfExperience { get; set; }
        public string? CvUrl { get; set; }

        public ICollection<Course> Courses { get; set; }
    }
}
