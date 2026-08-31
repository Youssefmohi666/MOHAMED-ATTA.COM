namespace elmanassa.Repositories.GenericRepository
{
    public interface IGenericRepo<T> where T : class
    {
        Task addOne(T entity);
        Task removeOne(T entity);
        Task updateOne(T entity);
        Task<T> GetOneById(int id);
        Task<List<T>> GetAll();
    }
}
