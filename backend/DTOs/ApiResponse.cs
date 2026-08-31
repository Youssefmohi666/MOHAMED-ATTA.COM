using System.Collections.Generic;

namespace elmanassa.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public ApiError? Error { get; set; }
        public ApiMeta Meta { get; set; }

        public ApiResponse(T data, bool success = true, int? totalCount = null)
        {
            Success = success;
            Data = data;
            Meta = new ApiMeta { Total = totalCount };
        }

        public ApiResponse(string message, string code = "ERROR", bool success = false)
        {
            Success = success;
            Error = new ApiError { Message = message, Code = code };
        }
    }

    public class ApiError
    {
        public string Code { get; set; }
        public string Message { get; set; }
        public List<FieldError>? Details { get; set; }
    }

    public class FieldError
    {
        public string Field { get; set; }
        public string Message { get; set; }
    }

    public class ApiMeta
    {
        public int Page { get; set; } = 1;
        public int PerPage { get; set; } = 20;
        public int? Total { get; set; }
    }
}
