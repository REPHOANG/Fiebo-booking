using DotNetEnv;
using Fiebo.API.Authorization;
using Fiebo.API.Middlewares;
using Fiebo.API.Services;
using Fiebo.API.Wrappers;
using Fiebo.Application.Interfaces;
using Fiebo.Application.Services;
using Fiebo.Domain.Constants;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.ExternalServices;
using Fiebo.Infrastructure.Services;
using Fiebo.Persistence.BackgroundJobs;
using Fiebo.Persistence.Data;
using Fiebo.Persistence.Identity;
using Fiebo.Persistence.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Reflection;
using System.Text;


Env.Load();
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var connectionString = builder.Configuration.GetConnectionString("MyCnn");

var serverVersion = new MySqlServerVersion(new Version(8, 0, 24));
builder.Services.AddDbContext<FieboDbContext>(options =>
{
    options.UseMySql(connectionString, serverVersion,
        b => b.MigrationsAssembly("Fiebo.Persistence"));
});

// ASP.NET Core Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<FieboDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication
builder.Services.AddAuthentication(opts =>
{
    opts.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opts.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SecretKey"]!))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ActiveOwnerPlan", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole(AppRoles.FieldOwner);
        policy.AddRequirements(new ActiveOwnerPlanRequirement(allowStaff: false));
    });

    options.AddPolicy("ActiveOwnerOrStaffPlan", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole(AppRoles.FieldOwner, AppRoles.FieldStaff);
        policy.AddRequirements(new ActiveOwnerPlanRequirement(allowStaff: true));
    });
});

builder.Services.AddScoped<IAuthorizationHandler, ActiveOwnerPlanHandler>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, OwnerPlanAuthorizationResultHandler>();

// Repository layer
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IVenueRepository, VenueRepository>();
builder.Services.AddScoped<IFieldRepository, FieldRepository>();
builder.Services.AddScoped<IBookingDetailRepository, BookingDetailRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<ISportTypeRepository, SportTypeRepository>();
builder.Services.AddScoped<ITimeSlotRepository, TimeSlotRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
//builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IWalletRepository, WalletRepository>();
builder.Services.AddScoped<ITopUpRequestRepository, TopUpRequestRepository>();
builder.Services.AddScoped<IWalletTransactionRepository, WalletTransactionRepository>();
builder.Services.AddScoped<ITicketEventRepository, TicketEventRepository>();
builder.Services.AddScoped<ITicketParticipantRepository, TicketParticipantRepository>();
builder.Services.AddScoped<ITicketEventDetailRepository, TicketEventDetailRepository>();
builder.Services.AddScoped<IVenueStaffRepository, VenueStaffRepository>();
builder.Services.AddScoped<IProvinceRepository, ProvinceRepository>();
builder.Services.AddScoped<IWardRepository, WardRepository>();
builder.Services.AddScoped<IVenueDocumentRepository, VenueDocumentRepository>();
builder.Services.AddScoped<IVenueDocumentImageRepository, VenueDocumentImageRepository>();
builder.Services.AddScoped<IFieldImageRepository, FieldImageRepository>();
builder.Services.AddScoped<IVenueServiceItemRepository, VenueServiceItemRepository>();
builder.Services.AddScoped<ISubscriptionPlanRepository, SubscriptionPlanRepository>();
builder.Services.AddScoped<IOwnerPlanRepository, OwnerPlanRepository>();
builder.Services.AddScoped<ISubscriptionTransactionRepository, SubscriptionTransactionRepository>();
builder.Services.AddScoped<ICancelBookingRepository, CancelBookingRepository>();
builder.Services.AddScoped<IUserBankAccountRepository, UserBankAccountRepository>();
builder.Services.AddScoped<IPayoutRepository, PayoutRepository>();
builder.Services.AddScoped<IAdminDashboardRepository, AdminDashboardRepository>();
// Service layer
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IIdentityService, IdentityService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<ICacheService, CacheService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<ISmsService, SpeedSmsService>();
builder.Services.AddScoped<IVenueService, VenueService>();
builder.Services.AddScoped<IMapService, OpenRouteService>();
builder.Services.AddScoped<IFieldService, FieldService>();
builder.Services.AddScoped<IBookingService, BookingService>();
//builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IQrPaymentService, QrPaymentService>();
builder.Services.AddHostedService<BookingExpirationJob>();
builder.Services.AddHostedService<TicketExpireJob>();
builder.Services.AddHostedService<BookingCompleteJob>();
builder.Services.AddHostedService<TicketEventStartJob>();
builder.Services.AddHostedService<TicketEventCompleteJob>();
builder.Services.AddHostedService<TicketEventAutoCancelJob>();
builder.Services.AddSingleton<SseService>();
builder.Services.AddScoped<INotificationService, SseNotificationService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IOwnerService, OwnerService>();
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<ITimeSlotService, TimeSlotService>();
builder.Services.AddScoped<IPayoutService, PayoutService>();
builder.Services.AddScoped<ISportTypeService, SportTypeService>();
builder.Services.AddScoped<IFinanceAdminService, FinanceAdminService>();
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();

builder.Services.AddHttpClient();

builder.Services.AddControllers();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = actionContext =>
    {
        var errors = actionContext.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(kvp => kvp.Value!.Errors)
            .Select(e => e.ErrorMessage)
            .ToList();

        var errorMessage = string.Join(" ", errors);

        var response = new ApiResponse<object>
        {
            StatusCode = StatusCodes.Status400BadRequest,
            Message = errorMessage
        };

        return new BadRequestObjectResult(response);
    };
});

// swagger configuration
#region
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddServer(new OpenApiServer
    {
        Url = "http://localhost:8080",
        Description = "Local"
    });
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter 'Bearer {token}'",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = "Bearer"
        }
    };

    c.AddSecurityDefinition("Bearer", securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            securityScheme,
            new string[] {}
        }
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
});
#endregion

// Serilog configuration
#region
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration) // đọc từ appsettings.json
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();
#endregion

var app = builder.Build();

app.UseCors("AllowFrontend");
app.UseMiddleware<Fiebo.API.Middlewares.ExceptionHandlingMiddleware>();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();
// Seed Data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<Fiebo.Persistence.Data.FieboDbContext>();

        // 1. Chạy lệnh tạo bảng (Migration)
        await context.Database.MigrateAsync();

        // 2. Gọi class DbInitializer của bạn và truyền 'services' vào
        await DbInitializer.SeedRolesAsync(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Database seeding failed");
    }
}

//// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
//    app.UseSwagger();
//    app.UseSwaggerUI();
//}

// Luôn bật Swagger (Cho cả môi trường Dev và Docker)
// sau này lên Server thật (Production) thì có thể khóa lại sau.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    // Đặt giao diện Swagger ngay tại thư mục gốc (http://localhost:8080/)
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fiebo API V1");
    c.RoutePrefix = string.Empty;
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
