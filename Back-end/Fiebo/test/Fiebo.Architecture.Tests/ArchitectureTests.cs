using FluentAssertions;
using NetArchTest.Rules;

namespace Fiebo.Architecture.Tests;

public class ArchitectureTests
{
    private const string DomainNamespace = "Fiebo.Domain";
    private const string ApplicationNamespace = "Fiebo.Application";
    private const string InfrastructureNamespace = "Fiebo.Infrastructure";
    private const string ApiNamespace = "Fiebo.API";

    [Fact]
    public void Domain_Should_Not_HaveDependencyOnOtherProject()
    {
        // Arrage
        var assembly = Domain.AssemblyReference.Assembly;

        var otherProjects = new[]
        {
            ApplicationNamespace,
            InfrastructureNamespace,
            ApiNamespace
        };

        // Act
        var testResult = Types
            .InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(otherProjects)
            .GetResult();

        // Assert
        testResult.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Application_Should_Not_HaveDependencyOnApiProject()
    {
        // Arrage
        var assembly = Application.AssemblyReference.Assembly;
        // Act
        var testResult = Types
            .InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOn(ApiNamespace)
            .GetResult();
        // Assert
        testResult.IsSuccessful.Should().BeTrue();
    }
}