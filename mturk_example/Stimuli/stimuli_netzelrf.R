# Creates stimuli for the experiment on judging relative distances of points in 
# parallel coordinates and cartesian coordinates.
# We will have 3 points A,B,C where A is fixed, and the participant has to judge
# whether B or C is closer to A.
# see google doc for description of factors
rm(list = ls())

library(dplyr)
library(ggplot2)
library(gridExtra)
library(grid)
library(assertthat)
library(RColorBrewer)
library(gtable)
library(Cairo)

# get reproducable results
set.seed(473289432)

# euclidean norm
norm <- function(v) {
  sqrt(sum(v^2))
}

# creates coordinates of points A,B and C for input factors
make_points <- function(distance_deviation, dimensions) {
  dim_count <- as.numeric(dimensions)
  assertthat::assert_that(dim_count > 0)
  distance_deviation <- as.numeric(distance_deviation)
  
  # random point A
  a <- 10 * runif(dim_count)
  
  # put B no closer than distance_deviation to A
  repeat {
    b <- 10 * runif(dim_count)
    d_ab <- norm(b - a)
    if (d_ab >= distance_deviation) {
      break
    }
  }
  #print(d_ab)
  # distance AC: randomly add/subtract distance_deviation
  d_ac <- d_ab + sample(c(1,-1), 1) * distance_deviation
  
  # sample coordinates for point C on hypersphere around A.
  # Make sure that C is in [0,10]
  repeat {
    c <- rnorm(dim_count)
    c <- a + d_ac * c / norm(c)
    within_bounds <- ifelse(c <= 10 & c >= 0, T, F)
    if (length(which(within_bounds)) == dim_count) {
      break
    }
  }
  data.frame(rbind(a, b, c))
}

# FACTORS:
coordinate_system <- c("Parallel", "Cartesian")
# distance_deviation <- seq(0.0, 0.5, length.out = 11)
#dimensions <- 2:4
#relative_distance <- 1:5

distance_deviation <- c(0.0, 0.25, 0.5)
dimensions <- c(2, 4)
# scaling form 800 that was chosen below to 1200 in width
img_scaling <- 1200/800


# creates a full factorial
# order will be randomized later

trials <- expand.grid(coordinate_system = coordinate_system, 
                      distance_deviation = distance_deviation, 
                      dimensions = dimensions)

# add URL
base_url <- "http://parallelcoordinates.de/mturk"
trials <- trials %>%
  mutate(
    filename = paste(row_number(),"_",coordinate_system,".png",sep=""),
    stimuli = paste(base_url,filename,sep="/"))

# trying to get it done in the R way....
# groups <- trials %>%
#   group_by(distance_deviation, dimensions) %>%
#   summarise() %>%
#   ungroup()
# 
# points <- groups %>%
#   rowwise() %>%
#   do(p = make_points(as.character(.$distance_deviation), as.character(.$dimensions))) %>%
#   mutate(A = as.character(as.data.frame(p)[1,])) %>%
#   bind_cols(groups)
# 
# trials %>% 
#   left_join(points)

# create empty lists for point coordinates (with various dimensions) to dataframe trials
A <- I(vector(mode="list", length(trials[,1])))
B <- I(vector(mode="list", length(trials[,1])))
C <- I(vector(mode="list", length(trials[,1])))

trials <- cbind(trials, A, B, C)
remove(A,B,C)

# Create vector of indeces to make combinations of distance_deviation and dimensions
comb <- expand.grid(distance_deviation, dimensions)
correct_answer <- c()

for(i in 1:length(comb[,1])) 
{
  dd = comb[i,1]
  p = make_points(as.character(dd), as.character(comb[i,2]))
  a = p[1,]
  b = p[2,]
  c = p[3,]
  d_ab = norm(b-a)
  d_ac = norm(c-a)
  d_bc = norm(b-c)
  assert_that(dd - abs(d_ab - d_ac) < 0.0000000001)
  answer <- "equal"
  if (dd > 0) {
    answer <- ifelse(d_ab < d_ac, "B", "C")
  }
  correct_answer[i*2] <- answer
  correct_answer[i*2-1] <- answer
  # Save for Cartesian
  trials[[i*2-1,6]] = as.character(p[1,])
  trials[[i*2-1,7]] = as.character(p[2,])
  trials[[i*2-1,8]] = as.character(p[3,])
  # PC is same as Cartesian, so no need to calc or converse again - q&d!
  trials[[i*2,6]] = trials[[i*2-1,6]]
  trials[[i*2,7]] = trials[[i*2-1,7]]
  trials[[i*2,8]] = trials[[i*2-1,8]]
}
trials <- cbind(trials, correct_answer)
rm(p, comb, a, b, c, d_ab, d_ac, d_bc, dd, correct_answer, answer)

# appearance based configuration
colors <- c("#000000", "#d95f02", "#1b9e77")
theme_exp <- theme_bw() + 
  theme(legend.position="none", 
        panel.grid.major.y = element_blank(),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(),
        axis.line = element_line(colour = "black", size = 1))

make_Cartesian <- function(a,b,c,id){ 
  dim <- length(a)
  a <- as.numeric(a)
  b <- as.numeric(b)
  c <- as.numeric(c)
  #cols <- rainbow(3)
  points <- data.frame(rbind(a,b,c))
  # make command grid.arrange string
  plotcmd <-"grid.arrange(";
  
  for(i in 1:(dim-1)){
    # X2 is always the ordinate, abscissa are all the other X values
    id_xs <- seq(1:dim) # ids of all the Xs that will be on the abscissa
    #id_xs <- id_xs[-2] # minus the 2nd one, as this is always on the ordinate
    
    plotx <- ggplot(points, aes_string(x = paste("X", toString(id_xs[i+1]), sep=""), y = paste("X", toString(id_xs[i]), sep=""))) + 
      geom_point(colour = colors, size = 5) + scale_x_continuous(expand = c(0.0,0.0), limits = c(-0.5, 10.5), breaks = 0:10) + scale_y_continuous(limits = c(0, 10), breaks = 0:10) + coord_fixed() 
    plotx <- plotx + theme_exp + theme(plot.margin=unit(c(0,2.5,0,0),"mm"), 
                                       panel.grid.major.x = element_blank(),
                                       axis.line = element_line(colour = "black", size = 0.5))
    
    # save figure handles to create grid
    assign(paste("plot", toString(i), sep = ""), plotx)
    # make command string
    plotcmd <- paste(plotcmd, "plot", toString(i), ", ", sep = "")
  }
  plotcmd <- paste(plotcmd, "ncol=", toString(dim-1), ")", sep ="")
  
  CairoPNG(paste(toString(id), "_Cartesian.png", sep=""), height=500*img_scaling, width=800*img_scaling)
  # run string command to make grid plots
  eval(parse(text=plotcmd))
  dev.off()
}

make_Parallel <- function(a,b,c,id){
  a <- as.numeric(a)
  b <- as.numeric(b)
  c <- as.numeric(c)
  dim <- length(a)
  Xlabels = sprintf("X%d", 1:dim)
  breaks <- 0:(dim - 1) * 10
  points <- data.frame(Vals=t(cbind(t(a),t(b),t(c))), Xs = breaks, Group = rep(LETTERS[1:3],each=dim))
  
  ploth <- ggplot(points) + geom_line(aes(x = Xs, y = Vals, group = Group, color = Group, size = 5))
  # need to expand on x-scale very slightly to get first and last grid line completely (else they are cut off)
  ploth <- ploth + scale_y_continuous(limits = c(0, 10), breaks = 0:10) + coord_fixed() + scale_x_continuous(breaks = breaks, labels = Xlabels, expand = c(0.001,0.001), limits = c(0, (dim - 1) * 10)) + scale_color_manual(values = colors)
  ploth <- ploth + theme_exp + theme(axis.title.y = element_blank(),
                                     axis.title.x = element_blank(),
                                     axis.line.y = element_blank(),
                                     axis.line.x = element_blank(),
                                     axis.text.x = element_text(size = 12, vjust = 0, lineheight = 0),
                                     panel.grid.major.x = element_line(colour = "black", size = 0.5))
  
  # add extra axes
  g1 <- ggplot_gtable(ggplot_build(ploth))
  ia <- which(g1$layout$name == "axis-l")
  ga <- g1$grobs[[ia]]
  
  for (d in 1:(dim-1)) {
    x <- d/(dim-1)
    ga$vp$x <- unit(x, "npc")
    g1 <- gtable_add_grob(g1, ga, 3, 4, 3, 4, name = as.character(x)) # second
  }
  
  CairoPNG(paste(toString(id), "_Parallel.png", sep=""), height=500*img_scaling, width=800*img_scaling)
  grid.draw(g1)
  dev.off()
}

# the R way...
# by_cs <- split(trials, coordinate_system)
# lapply(by_cs, function(cs) {
#   
# })

#Extract Legend 
g_legend<-function(a.gplot){ 
  tmp <- ggplot_gtable(ggplot_build(a.gplot)) 
  leg <- which(sapply(tmp$grobs, function(x) x$name) == "guide-box") 
  legend <- tmp$grobs[[leg]] 
  return(legend)} 

make_ParallelLegend <- function(){
  points <- data.frame(x=1:6, y=1:6, type = rep(LETTERS[1:3],each=2))
  # labs(color="") for changing legend title ... meh
  plotx <- ggplot(points, aes_string(x='x', y='y', color='type')) + geom_line(size = 30) + scale_color_manual(values = colors)
  plotx <- plotx + labs(colour = "") + theme(legend.key = element_rect(fill = NA, colour = NA))
  plotx <- plotx + theme(legend.key.size =  unit(2, "in"), legend.text = element_text(size=80)) 
  
  legend <- g_legend(plotx) 
  
  png("legend_Parallel.png")
  grid.draw(legend)  
  dev.off()
}

make_CartesianLegend <- function(){
  points <- data.frame(x=1:3, y=1:3, type = LETTERS[1:3])
  # labs(color="") for changing legend title ... meh
  plotx <- ggplot(points, aes_string(x='x', y='y', color='type')) + geom_point(size = 30) + scale_color_manual(values = colors)
  plotx <- plotx + labs(colour = "") + theme(legend.key = element_rect(fill = NA, colour = NA))
  plotx <- plotx + theme(legend.key.size =  unit(2, "in"), legend.text = element_text(size=80)) 
  
  legend <- g_legend(plotx) 
  
  png("legend_Cartesian.png")
  grid.draw(legend)  
  dev.off()
}

make_ParallelLegend()
make_CartesianLegend()

write_images <- function(rows = 1:nrow(trials)) {
  for (trialID in rows) { # meh ... I don't like this ...
    if (trials[trialID, 1] == "Cartesian") { 
      make_Cartesian(trials[[trialID,6]],trials[[trialID,7]],trials[[trialID,8]], trialID)
    }
    else {
      make_Parallel(trials[[trialID,6]],trials[[trialID,7]],trials[[trialID,8]], trialID)
    }
  }
}

write_exampleTrials <- function(){
  # make example for explanation of coordinate systems
  p2 = c("3","7")
  make_Cartesian(p2, p2, p2, 0.1)
  make_Parallel(p2, p2, p2, 0.1)
  p2[3] = "1"
  make_Cartesian(p2, p2, p2, 0.2)
  make_Parallel(p2, p2, p2, 0.2)
  
  # make very clear examples  
  # make example for relative distance estimates for explaination
  # 2D
  a <- c("5.4", "6.5")
  b <- c("4.1", "4.5")
  c <- c("9.5", "8.5")  
  make_Parallel(a, b, c, 0)  
  make_Cartesian(a, b, c, 0) 
  
  # 3D
  a <- c(3,5,1)
  b <- c(9,3,2)
  c <- c(5,7,3)  
  make_Parallel(a, b, c, 0.001)  
  make_Cartesian(a, b, c, 0.001) 
  
  # make test examples
  # 2D
  a <- c("8.9", "6.4")
  b <- c("2.5", "3.8")
  c <- c("9.5", "7.5")  
  make_Parallel(a, b, c, 0.01)  
  make_Cartesian(a, b, c, 0.01)   
  
  # 3D
  a <- c("7.4", "8.8", "6.7")
  b <- c("6.6", "5.5", "4.2")
  c <- c("2.1", "1.4", "3.9")
  make_Parallel(a, b, c, 0.02)  
  make_Cartesian(a, b, c, 0.02)
  
  # 4D
  a <- c("3.3", "5.7", "3.2", "2.7")
  b <- c("5.2", "7.2", "5", "6.1")
  c <- c("9.1", "9.5", "6.1", "8.3")
  make_Parallel(a, b, c, 0.03)  
  make_Cartesian(a, b, c, 0.03)   
}

# Write CSV file for dimensions separately
# also writes a file to be used as input for the MTurk interface
write_trials <- function() {
  filen <- "trials.csv"
  write.table(trials, filen, sep=";", row.names = F, quote = F)
  
  # save trials in R format
  save(trials, file="trials.RData")
}

write_exampleTrials()
write_images()
write_trials()


