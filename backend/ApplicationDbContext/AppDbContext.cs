using elmanassa.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.ApplicationDbContext
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected AppDbContext()
        {
        }

        #region Core Entities
        public DbSet<User> Users { get; set; }
        #endregion

        #region Course & Content
        public DbSet<Course> Courses { get; set; }
        public DbSet<CurriculumSection> CurriculumSections { get; set; }
        public DbSet<CurriculumLecture> CurriculumLectures { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Level> Levels { get; set; }
        public DbSet<Lecture> Lectures { get; set; }
        public DbSet<Review> Reviews { get; set; }
        #endregion

        #region Student Features
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<LectureProgress> LectureProgress { get; set; }
        #endregion

        #region Order & Payment
        public DbSet<Order> Orders { get; set; }
        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<AccountingTransaction> AccountingTransactions { get; set; }
        #endregion

        #region Media
        public DbSet<MediaFile> MediaFiles { get; set; }
        #endregion

        #region Interactive Features
        public DbSet<LiveStream> LiveStreams { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<AiConversation> AiConversations { get; set; }
        public DbSet<AiMessage> AiMessages { get; set; }
        #endregion

        #region Content & Messaging
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<BlogPost> BlogPosts { get; set; }
        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        public DbSet<Testimonial> Testimonials { get; set; }
        #endregion

        #region Presentations
        public DbSet<Presentation> Presentations { get; set; }
        #endregion

        #region Exams
        public DbSet<Exam> Exams { get; set; }
        public DbSet<ExamAttempt> ExamAttempts { get; set; }
        #endregion

        #region QuestionBank
        public DbSet<BankQuestion> BankQuestions { get; set; }
        #endregion

        #region Legacy (Keep for intermediate migration)
        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<AiLearningActivity> AiLearningActivities { get; set; }
        #endregion

        #region Attendance
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        #endregion

        #region Analytics
        public DbSet<Assessment> Assessments { get; set; }
        public DbSet<AssessmentGrade> AssessmentGrades { get; set; }
        public DbSet<ClassRoom> ClassRooms { get; set; }
        public DbSet<AttendanceLog> AttendanceLogs { get; set; }
        #endregion

        #region Employees
        public DbSet<Employee> Employees { get; set; }
        #endregion

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ===== User Configuration =====
            modelBuilder.Entity<User>().Property(u => u.Id).ValueGeneratedNever();
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<User>().HasIndex(u => u.Role);

            // ===== Course Configuration =====
            modelBuilder.Entity<Course>()
                .HasOne(c => c.Instructor)
                .WithMany()
                .HasForeignKey(c => c.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Course>().HasIndex(c => c.Category);
            modelBuilder.Entity<Course>().HasIndex(c => c.InstructorId);
            modelBuilder.Entity<Course>().HasIndex(c => c.Status);

            // ===== Curriculum Configuration =====
            modelBuilder.Entity<CurriculumSection>()
                .HasOne(cs => cs.Course)
                .WithMany(c => c.CurriculumSections)
                .HasForeignKey(cs => cs.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<CurriculumSection>().HasIndex(cs => cs.CourseId);

            modelBuilder.Entity<CurriculumLecture>()
                .HasOne(cl => cl.Section)
                .WithMany(cs => cs.Lectures)
                .HasForeignKey(cl => cl.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== Subject/Level/Lecture Configuration =====
            modelBuilder.Entity<Subject>()
                .HasOne(s => s.Teacher)
                .WithMany()
                .HasForeignKey(s => s.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Subject>().HasIndex(s => s.TeacherId);

            modelBuilder.Entity<Level>()
                .HasOne(l => l.Subject)
                .WithMany(s => s.Levels)
                .HasForeignKey(l => l.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Lecture>()
                .HasOne(l => l.Level)
                .WithMany(lv => lv.Lectures)
                .HasForeignKey(l => l.LevelId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== Enrollment Configuration =====
            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Course)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Subject)
                .WithMany()
                .HasForeignKey(e => e.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Enrollment>().HasIndex(e => e.UserId);

            // ===== LectureProgress Configuration =====
            modelBuilder.Entity<LectureProgress>()
                .HasOne(lp => lp.User)
                .WithMany()
                .HasForeignKey(lp => lp.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<LectureProgress>()
                .HasOne(lp => lp.Lecture)
                .WithMany()
                .HasForeignKey(lp => lp.LectureId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== Review Configuration =====
            modelBuilder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Course)
                .WithMany()
                .HasForeignKey(r => r.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Subject)
                .WithMany()
                .HasForeignKey(r => r.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Review>().HasIndex(r => r.SubjectId);

            // ===== Order & Coupon Configuration =====
            modelBuilder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Course)
                .WithMany()
                .HasForeignKey(o => o.CourseId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Subject)
                .WithMany()
                .HasForeignKey(o => o.SubjectId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Coupon)
                .WithMany()
                .HasForeignKey(o => o.CouponId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Order>().HasIndex(o => o.UserId);

            modelBuilder.Entity<Coupon>().HasIndex(c => c.Code).IsUnique();

            // ===== MediaFile Configuration =====
            modelBuilder.Entity<MediaFile>()
                .HasOne(m => m.Subject)
                .WithMany()
                .HasForeignKey(m => m.SubjectId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<MediaFile>()
                .HasOne(m => m.Lecture)
                .WithMany()
                .HasForeignKey(m => m.LectureId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<MediaFile>().HasIndex(m => m.FileType);
            modelBuilder.Entity<MediaFile>().HasIndex(m => m.SubjectId);
            modelBuilder.Entity<MediaFile>().HasIndex(m => m.LectureId);

            // ===== PaymentTransaction Configuration =====
            modelBuilder.Entity<PaymentTransaction>()
                .HasOne(t => t.Order)
                .WithMany()
                .HasForeignKey(t => t.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<PaymentTransaction>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<PaymentTransaction>().HasIndex(t => t.MerchantOrderId).IsUnique();
            modelBuilder.Entity<PaymentTransaction>().HasIndex(t => t.OrderId);

            // ===== AccountingTransaction Configuration =====
            modelBuilder.Entity<AccountingTransaction>()
                .HasOne(a => a.Teacher)
                .WithMany()
                .HasForeignKey(a => a.TeacherId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<AccountingTransaction>().HasIndex(a => a.Date);
            modelBuilder.Entity<AccountingTransaction>().HasIndex(a => a.Type);
            modelBuilder.Entity<AccountingTransaction>().HasIndex(a => a.TeacherId);

            // ===== LiveStream & Chat Configuration =====
            modelBuilder.Entity<LiveStream>()
                .HasOne(ls => ls.Instructor)
                .WithMany()
                .HasForeignKey(ls => ls.InstructorId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<LiveStream>()
                .HasMany(ls => ls.ChatMessages)
                .WithOne(cm => cm.Stream)
                .HasForeignKey(cm => cm.StreamId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.User)
                .WithMany()
                .HasForeignKey(cm => cm.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ===== AI Configuration =====
            modelBuilder.Entity<AiConversation>()
                .HasOne(ac => ac.User)
                .WithMany()
                .HasForeignKey(ac => ac.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<AiConversation>()
                .HasMany(ac => ac.Messages)
                .WithOne(am => am.Conversation)
                .HasForeignKey(am => am.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== Blog & Content Configuration =====
            modelBuilder.Entity<BlogPost>()
                .HasOne(bp => bp.Author)
                .WithMany()
                .HasForeignKey(bp => bp.AuthorId)
                .OnDelete(DeleteBehavior.SetNull);

            // ===== Presentation Configuration =====
            modelBuilder.Entity<Presentation>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Id).ValueGeneratedNever();
                entity.Property(p => p.Title).HasMaxLength(500);
                entity.Property(p => p.Topic).IsRequired();
                entity.Property(p => p.Style).HasMaxLength(100);
                entity.Property(p => p.Status).HasMaxLength(50);
                entity.HasIndex(p => p.UserId);
            });

            // ===== Exam Configuration =====
            modelBuilder.Entity<Exam>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedNever();
                entity.Property(e => e.Title).HasMaxLength(500).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.HasIndex(e => e.TeacherId);
                entity.HasIndex(e => e.SubjectId);
            });

            modelBuilder.Entity<ExamAttempt>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.Property(a => a.Id).ValueGeneratedNever();
                entity.Property(a => a.Status).HasMaxLength(50);
                entity.HasIndex(a => a.ExamId);
                entity.HasIndex(a => a.StudentId);
            });

            // Legacy entity configurations
            modelBuilder.Entity<Student>().Property(s => s.Id).ValueGeneratedOnAdd();
            modelBuilder.Entity<Student>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Teacher>().Property(t => t.Id).ValueGeneratedOnAdd();
            modelBuilder.Entity<Teacher>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AiLearningActivity>().Property(a => a.Id).ValueGeneratedOnAdd();
            modelBuilder.Entity<AiLearningActivity>()
                .HasOne(a => a.Student)
                .WithMany(s => s.AiLearningActivities)
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== AttendanceRecord Configuration =====
            modelBuilder.Entity<AttendanceRecord>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<AttendanceRecord>()
                .HasOne(a => a.Subject)
                .WithMany()
                .HasForeignKey(a => a.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<AttendanceRecord>()
                .HasIndex(a => new { a.StudentId, a.SubjectId, a.Date })
                .IsUnique();
            modelBuilder.Entity<AttendanceRecord>().HasIndex(a => a.SubjectId);
            modelBuilder.Entity<AttendanceRecord>().HasIndex(a => a.Date);
            modelBuilder.Entity<AttendanceRecord>().HasIndex(a => a.Status);

            // ===== Analytics Configuration =====
            modelBuilder.Entity<ClassRoom>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).ValueGeneratedNever();
                entity.HasOne(c => c.Subject)
                    .WithMany()
                    .HasForeignKey(c => c.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(c => c.SubjectId);
            });

            modelBuilder.Entity<Assessment>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.Property(a => a.Id).ValueGeneratedNever();
                entity.HasOne(a => a.Subject)
                    .WithMany()
                    .HasForeignKey(a => a.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(a => a.ClassRoom)
                    .WithMany()
                    .HasForeignKey(a => a.ClassRoomId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(a => a.SubjectId);
                entity.HasIndex(a => a.ClassRoomId);
            });

            modelBuilder.Entity<AssessmentGrade>(entity =>
            {
                entity.HasKey(g => g.Id);
                entity.Property(g => g.Id).ValueGeneratedNever();
                entity.HasOne(g => g.Assessment)
                    .WithMany()
                    .HasForeignKey(g => g.AssessmentId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(g => g.User)
                    .WithMany()
                    .HasForeignKey(g => g.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(g => g.AssessmentId);
                entity.HasIndex(g => g.UserId);
            });

            modelBuilder.Entity<AttendanceLog>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.Property(a => a.Id).ValueGeneratedNever();
                entity.HasOne(a => a.Student)
                    .WithMany()
                    .HasForeignKey(a => a.StudentId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(a => a.Subject)
                    .WithMany()
                    .HasForeignKey(a => a.SubjectId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(a => a.ClassRoom)
                    .WithMany()
                    .HasForeignKey(a => a.ClassRoomId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(a => a.StudentId);
                entity.HasIndex(a => a.SubjectId);
                entity.HasIndex(a => a.ClassRoomId);
            });

            // ===== Employee Configuration =====
            modelBuilder.Entity<Employee>().HasIndex(e => e.Position);
            modelBuilder.Entity<Employee>().HasIndex(e => e.Status);
            modelBuilder.Entity<Employee>().HasIndex(e => e.HireDate);
        }
    }
}
