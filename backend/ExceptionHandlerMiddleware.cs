using elmanassa.DTOs;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Text.Json;

namespace elmanassa
{
    public class ExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlerMiddleware> _logger;

        public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (BusinessRuleException ex)
            {
                _logger.LogWarning(ex, "Business rule violation");
                await HandleExceptionAsync(context, ex, HttpStatusCode.Conflict);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception");
                await HandleExceptionAsync(context, ex, HttpStatusCode.InternalServerError);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception, HttpStatusCode statusCode)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            var response = new ApiResponse<object>(
                exception is BusinessRuleException ? exception.Message : "An unexpected error occurred.",
                exception is BusinessRuleException ? "CONFLICT" : "SERVER_ERROR",
                false);

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var json = JsonSerializer.Serialize(response, options);
            return context.Response.WriteAsync(json);
        }
    }
}