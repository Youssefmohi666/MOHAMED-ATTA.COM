using System;
using System.Collections.Generic;

namespace elmanassa.DTOs
{
    public class StudentGroupDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string Color { get; set; } = "#6366f1";
        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<StudentGroupMemberDto> Members { get; set; } = new List<StudentGroupMemberDto>();
    }

    public class StudentGroupMemberDto
    {
        public int Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentEmail { get; set; }
        public string? PhoneNumber { get; set; }
        public DateTime JoinedAt { get; set; }
    }

    public class CreateStudentGroupDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? SubjectId { get; set; }
        public string Color { get; set; } = "#6366f1";
    }

    public class UpdateStudentGroupDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public Guid? SubjectId { get; set; }
        public string? Color { get; set; }
    }

    public class AddGroupMembersDto
    {
        public List<Guid> StudentIds { get; set; } = new List<Guid>();
    }
}