# Rain Check 

This tool is created with React and Vite, works with the national weather service forecast API. 
[https://www.weather.gov/](https://www.weather.gov/)

There are two main modes. Both of them are meant to be used in order to find rain-free, low risk times to hold an outage of mission critical applications. 

# Confirm an Outage 
This mode accepts arguments for: 
  1.The date of the proposed outage. Note that the forecast available via the API is only available out 7 days. 
  2.The start time of the outage. 
  3.The duration of the outage. This number will be used in conjunction with the Buffer.
  4.The threshold of acceptable rain. This number will be the acceptable cut off, or in other words, it can rain UP TO this amount and be an acceptable outage.
  5.The buffer around the outage. This is the wiggle room, for if you have issues getting the app back online, or want to know it won't start pouring as you're finishing up. 

With those arguments entered the results will show a verdict of the safety of the outage, the amount of rain during the duration + buffer, the % of rain, and whenever the closest rain event is. 

# Recommend an Outage
This mode accepts a lot of the same arguments. It also requires: 
1. Search Next - this is the number of rolling 24 hour days to search for an outage in. If you select 7 days at noon on Monday, it will search for acceptable start times until 12 on the following Sunday.
2. Outside Business Hours toggle. When set to On, all returned outage start times will be outside of the specified hours.

In addition, recommend outage will take into account any specified Preferred Day from the settings. 

The results will show 3 options for outages, ranked from lowest rain/highest safety and preferred day. Each recommendation can be expanded for more info. 

# Future Plans/ToDos 
1. Add weather icons to recommendations.
2. Allow for more than one preferred day
3. Implement preferred start time
4. Implement logic for up to 10 coordinate pairs for full city planning. 
5. Fix ugly status titles
6. Add more background images, dependent on weather
7. Fix ugly input dropdows

