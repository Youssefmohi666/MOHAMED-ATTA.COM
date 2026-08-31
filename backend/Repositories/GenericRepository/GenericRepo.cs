
using elmanassa.ApplicationDbContext;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories.GenericRepository
{
    public class GenericRepo<T> : IGenericRepo<T> where T : class
    {
        protected readonly AppDbContext db;
        public GenericRepo(AppDbContext context)
        {
            db = context;
        }
        public async Task addOne(T entity)
        {
            await db.Set<T>().AddAsync(entity);
            await db.SaveChangesAsync();
        }

        public async Task<List<T>> GetAll()
        {
            return await db.Set<T>().ToListAsync();
        }

        public async Task<T> GetOneById(int id)
        {
            return await db.Set<T>().FindAsync(id);
        }

        public async Task removeOne(T entity)
        {
            db.Set<T>().Remove(entity);
            await db.SaveChangesAsync();
        }

        public async Task updateOne(T entity)
        {
            db.Set<T>().Update(entity);
            await db.SaveChangesAsync();
        }
    }
}
