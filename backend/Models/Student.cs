using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class Student
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public DateTime DateOfBirth { get; set; }

        public string EducationLevel { get; set; } // e.g., High School, Bachelor, etc.

        public ICollection<Enrollment> Enrollments { get; set; }
        public ICollection<AiLearningActivity> AiLearningActivities { get; set; }
    }
}
