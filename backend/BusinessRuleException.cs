using System;

namespace elmanassa
{
    /// <summary>
    /// Thrown when a business rule prevents an operation.
    /// Middleware/controllers map this to an appropriate HTTP status (e.g. 409/400).
    /// </summary>
    public class BusinessRuleException : Exception
    {
        public BusinessRuleException(string message) : base(message) { }
        public BusinessRuleException(string message, Exception inner) : base(message, inner) { }
    }
}