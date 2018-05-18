﻿using System;
using System.IO;
using System.Json;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Android.Animation;
using Android.OS;
using Android.Views;
using Android.Widget;

using EFRFrontEndTest2.Assets;

namespace EFRFrontEndTest2.Fragments
{
    public class Feeds : Android.Support.V4.App.Fragment
    {
        private View m_view;
        private UserObject user = SingleUserObject.getObject();

        public override void OnCreate(Bundle savedInstanceState)
        {
            base.OnCreate(savedInstanceState);

            // Create your fragment here
        }

        public override void OnResume()
        {
            base.OnResume();
            setBackgrounds();
        }

        public static Feeds NewInstance()
        {
            Feeds temp = new Feeds();

            return temp;
        }

        public override View OnCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState)
        {
            // Use this to return your custom view for this Fragment
            // return inflater.Inflate(Resource.Layout.YourFragment, container, false);
            m_view = inflater.Inflate(Resource.Layout.BubbleLiveFeed, container, false);
            setBackgrounds();

            Task.Run(async () => { await CallDatabase(); });
            Button bubble = m_view.FindViewById<Button>(Resource.Id.bigbubble);

            bubble.Click += (sender, e) =>
            {
                AbsoluteLayout layoutBase = m_view.FindViewById<AbsoluteLayout>(Resource.Id.bubble_layout);
                
                ImageView img = new ImageView(layoutBase.Context);
                Button bubbleButton = m_view.FindViewById<Button>(Resource.Id.bigbubble);
                //create new bubble image
                img.LayoutParameters = new LinearLayout.LayoutParams(width: ViewGroup.LayoutParams.MatchParent, height: ViewGroup.LayoutParams.MatchParent);
                img.Visibility = ViewStates.Visible;
                img.SetImageResource(Resource.Drawable.Bubble);
                var metrics = Resources.DisplayMetrics;
                //place the bubble on screen randomizing it's x pos
                layoutBase.AddView(img, 100, 100);
                Random rnd = new Random();
                img.SetX(rnd.Next(0, metrics.WidthPixels));
                img.SetY(metrics.HeightPixels);
                // create an animator to move the bubble

                ValueAnimator animator = ValueAnimator.OfInt(metrics.HeightPixels, metrics.HeightPixels / 11);
                animator.SetDuration(1500);
                animator.Start();
                /* 
                 * function to move bubble
                 * called each frame the animation occurs
                 * and moved the bubble upward and in a sine wave
                 */
                animator.Update += (object sender2, ValueAnimator.AnimatorUpdateEventArgs f) =>
                {
                    //animation value
                    int newValue = (int)f.Animation.AnimatedValue;
                    // Apply this new value to the object being animated.
                    img.TranslationY = newValue;
                    //move the bubble in a sine wave pattern
                    if (newValue >= metrics.HeightPixels / 9)
                        img.TranslationX += 10 * (float)Math.Sin(newValue / 100);
                    //if near the top slide the bubble into the big bubble at the top
                    else
                    {
                        if (img.TranslationX > 500)
                            img.TranslationX -= 3;
                        else
                            img.TranslationX += 3;
                    }

                    //remove the bubble and increment the counter
                    if (1 == f.Animation.AnimatedFraction)
                    {
                        layoutBase.RemoveView(img);
                        string newval = '$' + (double.Parse(bubbleButton.Text.Remove(0, 1)) + 0.01).ToString();
                        if (newval.IndexOf('.') - newval.Length == -2)
                            newval += '0';
                        bubbleButton.Text = newval;
                    }
                };
            };

            return m_view;
        }

        public async Task<bool> CallDatabase()
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(new Uri("http://34.216.143.255:3002/api/bubble_feed"));
            request.ContentType = "application/json";
            request.Method = "Get";
            bool spawn = true;
            while (spawn)
            {
                JsonArray prevdata = null;
                using (WebResponse response = await request.GetResponseAsync())
                {
                    // Get a stream representation of the HTTP web response:
                    using (Stream stream = response.GetResponseStream())
                    {
                        // Use this stream to build a JSON document object:
                        JsonValue jsonDoc = JsonValue.Load(stream);
                        JsonArray data = (JsonArray)jsonDoc["data"];
                        if (prevdata != data)
                        {
                            if ((data[0])["donated"] != (prevdata[0])["donated"])
                            {
                                for (int x = 0; x < data.Count; x++)
                                {
                                    spawnBubble((data[x])["donated"]);
                                    Thread.Sleep(100);
                                }
                            }
                            else
                            {
                                int y;
                                for (int x = 0; x < data.Count && x < prevdata.Count; x++)
                                {
                                    if ((data[x])["donated"] != (prevdata[x])["donated"])
                                    {
                                        spawnBubble((data[x])["donated"]);
                                        Thread.Sleep(100);
                                    }
                                }
                                for (y = 0; y < data.Count; y++)
                                {
                                    spawnBubble((data[y])["donated"]);
                                    Thread.Sleep(100);
                                }
                            }
                            prevdata = data;
                        }
                    }
                }
                Thread.Sleep(10000);
            }
            return true;
        }

        public void spawnBubble(int spawn)
        {

            AbsoluteLayout layoutBase = m_view.FindViewById<AbsoluteLayout>(Resource.Id.bubble_layout);
            ImageView img = new ImageView(layoutBase.Context);
            Button bubbleButton = m_view.FindViewById<Button>(Resource.Id.bigbubble);
            //create new bubble image
            img.LayoutParameters = new LinearLayout.LayoutParams(width: ViewGroup.LayoutParams.MatchParent, height: ViewGroup.LayoutParams.MatchParent);
            img.Visibility = ViewStates.Visible;
            img.SetImageResource(Resource.Drawable.Bubble);
            var metrics = Resources.DisplayMetrics;
            //place the bubble on screen randomizing it's x pos
            layoutBase.AddView(img, 100 + spawn, 100 + spawn);
            Random rnd = new Random();
            img.SetX(rnd.Next(0, metrics.WidthPixels));
            img.SetY(metrics.HeightPixels);
            // create an animator to move the bubble

            ValueAnimator animator = ValueAnimator.OfInt(metrics.HeightPixels, metrics.HeightPixels / 11);
            animator.SetDuration(1500);
            animator.Start();
            /* 
             * function to move bubble
             * called each frame the animation occurs
             * and moved the bubble upward and in a sine wave
             */
            animator.Update += (object sender2, ValueAnimator.AnimatorUpdateEventArgs f) =>
            {
                //animation value
                int newValue = (int)f.Animation.AnimatedValue;
                // Apply this new value to the object being animated.
                img.TranslationY = newValue;
                //move the bubble in a sine wave pattern
                if (newValue >= metrics.HeightPixels / 9)
                    img.TranslationX += 10 * (float)Math.Sin(newValue / 100);
                //if near the top slide the bubble into the big bubble at the top
                else
                {
                    if (img.TranslationX > 500)
                        img.TranslationX -= 3;
                    else
                        img.TranslationX += 3;
                }
                //remove the bubble and increment the counter
                if (1 == f.Animation.AnimatedFraction)
                {
                    double cashout = img.Width - 100;
                    cashout /= 100;
                    layoutBase.RemoveView(img);
                    string newval = '$' + (double.Parse(bubbleButton.Text.Remove(0, 1)) + cashout).ToString();
                    if (newval.IndexOf('.') - newval.Length == -2)
                        newval += '0';
                    bubbleButton.Text = newval;
                }
            };
        }

        protected void setBackgrounds()
        {
            if (AppBackground.background != null)
            {
                AbsoluteLayout background = m_view.FindViewById<AbsoluteLayout>(Resource.Id.bubble_layout);
                background.Background = AppBackground.background;
            }
            ImageView charity = m_view.FindViewById<ImageView>(Resource.Id.currentCharity);

            switch (user.CharityName)
            {
                case "Alzheimer's Association":
                    charity.SetBackgroundResource(Resource.Drawable.charity_alzheimers_association);
                    break;
                case "American Cancer Society":
                    charity.SetBackgroundResource(Resource.Drawable.charity_american_cancer_society);
                    break;
                case "American Heart Association":
                    charity.SetBackgroundResource(Resource.Drawable.charity_american_heart_association);
                    break;
                case "American Red Cross":
                    charity.SetBackgroundResource(Resource.Drawable.charity_red_cross);
                    break;
                case "ASPCA":
                    charity.SetBackgroundResource(Resource.Drawable.charity_ASPCA);
                    break;
                case "Boy's and Girl's Club's of America":
                    charity.SetBackgroundResource(Resource.Drawable.charity_boys_and_girls_club);
                    break;
                case "Compassion":
                    charity.SetBackgroundResource(Resource.Drawable.charity_compassion);
                    break;
                case "Direct Relief":
                    charity.SetBackgroundResource(Resource.Drawable.charity_direct_relief);
                    break;
                case "Make-A-Wish":
                    charity.SetBackgroundResource(Resource.Drawable.charity_make_a_wish);
                    break;
                case "St. Jude Childrens Research Hospital":
                    charity.SetBackgroundResource(Resource.Drawable.charity_st_jude_childrens_research);
                    break;
                case "Susan G Komen":
                    charity.SetBackgroundResource(Resource.Drawable.charity_susan_g_komen);
                    break;
                case "Task Force Global Health":
                    charity.SetBackgroundResource(Resource.Drawable.charity_task_force_for_global_health);
                    break;
                case "The Humane Society":
                    charity.SetBackgroundResource(Resource.Drawable.charity_the_humane_society);
                    break;
                case "Toys-For-Tots":
                    charity.SetBackgroundResource(Resource.Drawable.charity_toys_for_tots);
                    break;
                case "United Way":
                    charity.SetBackgroundResource(Resource.Drawable.charity_united_way);
                    break;
                case "World Wildlife Fund":
                    charity.SetBackgroundResource(Resource.Drawable.charity_world_wildlife_foundation);
                    break;
                case "Wounded Warrior Project":
                    charity.SetBackgroundResource(Resource.Drawable.charity_wounded_warrior_project);
                    break;
                default:
                    charity.SetBackgroundResource(Resource.Drawable.charity_red_cross);
                    break;
            }
        }
    }
}