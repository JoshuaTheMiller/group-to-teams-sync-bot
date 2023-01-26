using Gttsb.Core;
using Gttsb.Gh;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<AppOptions>(builder.Configuration.GetSection("GitHubApp"));
builder.Services.Configure<AzureOptions>(builder.Configuration.GetSection("Azure"));

builder.Services.AddSingleton<IGitHubFacadeFactory, GitHubFacadeFactory>();
builder.Services.AddSingleton<IActiveDirectoryFacadeFactory, ActiveDirectoryFacadeFactory>();
builder.Services.AddSingleton<IActiveDirectoryFacade>(p => p.GetRequiredService<IActiveDirectoryFacadeFactory>().GetActiveDirectoryClient());

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.TagActionsBy(d =>
    {
        return new List<string>() { d.ActionDescriptor.AttributeRouteInfo.Name ?? d.ActionDescriptor.DisplayName! };
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
    app.UseSwagger();
    app.UseSwaggerUI();
//}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();