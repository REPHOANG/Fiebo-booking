using Fiebo.Application.Interfaces;
using Fiebo.Domain.DTO.Field;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class OpenRouteService : IMapService
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;

        public OpenRouteService(
            HttpClient http,
            IConfiguration config)
        {
            _http = http;
            _apiKey = config["OpenRouteService:ApiKey"]!;
        }

        public async Task<Dictionary<int, double>>
            GetDistancesAsync(
                double userLat,
                double userLng,
                List<VenueLocationDto> fields)
        {
            if (!fields.Any())
                return [];


            const string url =
                "https://api.openrouteservice.org/v2/matrix/driving-car";

            var locations = new List<double[]>
            {
                // User = index 0
                ([userLng, userLat])
            };

            foreach (var f in fields)
            {
                locations.Add([f.Lng, f.Lat]);
            }

            var body = new
            {
                locations,

                sources = new[] { 0 },

                destinations =
                    Enumerable.Range(1, fields.Count).ToArray(),

                metrics = new[] { "distance" }
            };

            var request = new HttpRequestMessage(
                HttpMethod.Post, url);

            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", _apiKey);

            request.Content = new StringContent(
                JsonSerializer.Serialize(body),
                Encoding.UTF8,
                "application/json");

            var response = await _http.SendAsync(request);

            var json =
                await response.Content.ReadAsStringAsync();


            if (!response.IsSuccessStatusCode)
            {
                throw new Exception(
                    $"ORS Error: {json}");
            }

            var doc = JsonDocument.Parse(json);

            var distArr =
                doc.RootElement
                   .GetProperty("distances")[0];

            var result =
                new Dictionary<int, double>();


            for (int i = 0; i < fields.Count; i++)
            {
                result[fields[i].VenueId] =
                    Math.Round(
                        distArr[i].GetDouble() / 1000,
                        2);
            }

            return result;
        }
    }
}
