# Creates stimuli for the experiment on judging relative distances of points in 
# parallel coordinates and cartesian coordinates.
# We will have 3 points A,B,C where A is fixed, and the participant has to judge
# whether B or C is closer to A.
# see google doc for description of factors

rm(list = ls())

# library(MASS)
library(dplyr)
library(ggplot2)
# library(cowplot)
library(gridExtra)
library(grid)
# library(GGally)

rot <- function(a) {
  matrix(c(cos(a), sin(a), -sin(a), cos(a)), nrow = 2, byrow = T)
}

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
coordinate_system <- factor(c("Parallel", "Cartesian"))
distance_deviation <- factor(seq(0.0, 0.5, length.out = 11))
dimensions <- factor(2:4)
relative_distance <- factor(1:5)

# creates a full factorial
# TODO: which order?

trials <- expand.grid(coordinate_system = coordinate_system, 
                      distance_deviation = distance_deviation, 
                      dimensions = dimensions)

# create empty lists for point coordinates (with various dimensions) to dataframe trials
A <- I(vector(mode="list", length(trials[,1])))
B <- I(vector(mode="list", length(trials[,1])))
C <- I(vector(mode="list", length(trials[,1])))

trials <- cbind(trials, A, B, C)
remove(A,B,C)

# Create vector of indeces to make combinations of distance_deviation and dimensions
comb <- expand.grid(distance_deviation, dimensions)

for(i in 1:length(comb[,1])) 
{
  p = make_points(as.character(comb[i,1]), as.character(comb[i,2]))
  # Save for Cartesian
  trials[[i*2-1,4]] = as.character(p[1,])
  trials[[i*2-1,5]] = as.character(p[2,])
  trials[[i*2-1,6]] = as.character(p[3,])
  # PC is same as Cartesian, so no need to calc or converse again - q&d!
  trials[[i*2,4]] = trials[[i*2-1,4]]
  trials[[i*2,5]] = trials[[i*2-1,5]]
  trials[[i*2,6]] = trials[[i*2-1,6]]
}

# # TODO:
# # add point coordinates to 'trials'
# # create plots for every row in 'trials'
# test <- make_points(0.5, 3)
# plot.data <- rbind(test, test)
# plot.data <- cbind(plot.data, t = c(rep(1,3), rep(2,3)))
# ggplot(plot.data, aes(x = X1, y = X2)) + geom_point(aes(size = 5)) + xlim(0,10) + ylim(0,10) + facet_wrap(~t)
# 

make_Cartesian <- function(a,b,c,id){ 
  dim <- length(a)
  a <- as.numeric(a)
  b <- as.numeric(b)
  c <- as.numeric(c)
  cols <- rainbow(3)
  points <- data.frame(rbind(a,b,c))
  # make command grid.arrange string
  plotcmd <-"grid.arrange(";
  
  for(i in 1:(dim-1)){
    # X2 is always the ordinate, abscissa are all the other X values
    id_xs <- seq(1:dim) # ids of all the Xs that will be on the abscissa
    id_xs <- id_xs[-2] # minus the 2nd one, as this is always on the ordinate
    
    plotx <- ggplot(points, aes_string(x = paste("X", toString(id_xs[i]), sep=""), y = "X2")) + geom_point(colour = cols, size = 5) + xlim(0,10) + ylim(0,10) + coord_fixed()
    plotx <- plotx + theme(plot.margin=unit(c(0,1,0,0),"mm"))
    
    # save figure handles to create grid
    assign(paste("plot", toString(i), sep = ""), plotx)
    # make command string
    plotcmd <- paste(plotcmd, "plot", toString(i), ", ", sep = "")
  }
  plotcmd <- paste(plotcmd, "ncol=", toString(dim-1), ")", sep ="")
  
  png(paste(toString(id), "_Cartesian.png", sep=""), height=500, width=1000)
  # run string command to make grid plots
  eval(parse(text=plotcmd))
  dev.off()
}

make_Parallel <- function(a,b,c,id){
  a <- as.numeric(a)
  b <- as.numeric(b)
  c <- as.numeric(c)
  dim <- length(a)
  cols <- rainbow(3)
  Xlabels = sprintf("X%d", 1:dim)
  points <- data.frame(Vals=t(cbind(t(a),t(b),t(c))), Xs = rep(Xlabels,times=3), Group = rep(LETTERS[1:3],each=dim))
  
  ploth <- ggplot(points) + geom_line(aes(x = Xs, y = Vals, group = Group, color = Group)) + ylim(0,10)
  ploth <- ploth + theme(axis.title.y=element_blank(),axis.title.x=element_blank(),legend.position="none")
  
  png(paste(toString(id), "_Parallel.png", sep=""), height=500, width=1000)
  print(ploth)
  dev.off()
}

# Let's make some test plots
testTrials = c(1,2,43,44,65,66)

# the R way...
# by_cs <- split(trials, coordinate_system)
# lapply(by_cs, function(cs) {
#   
# })

for (i in 1:length(testTrials)) { # meh ... I don't like this ...
  trialID = testTrials[i]
  if (trialID %% 2) { 
    make_Cartesian(trials[[trialID,4]],trials[[trialID,5]],trials[[trialID,6]], trialID)
  }
  else {
    make_Parallel(trials[[trialID,4]],trials[[trialID,5]],trials[[trialID,6]], trialID)
  }
}

# Write CSV file for dimensions separately
filen <- "trials.csv"
sepvar = c("sep=;") # need this so excel knows separator
writeLines(sepvar, filen)
out_file <- file(filen, open="a")
write.table(trials, out_file, sep=";", row.names=F)
close(out_file)

# save trials
save(trials, file="trials.RData")

# trials_dim <- split(trials, trials$dimensions)
# names(trials_dim) <- seq(2:max(as.numeric(as.character(dimensions))))
# 
# lapply(1:length(trials_dim), function(i)
# {
#   out_file <- file(paste0("trials_dim", names(trials_dim[i]), ".csv"), open="a")
#   write.csv(trials_dim[[i]][1:3], out_file, row.names = T)
#   lapply(1:(i+1), function(j)
#   {
#     df <- as.data.frame(trials_dim[[i]])
#     write.csv(df[j], out_file, row.names = T)
#   })
#   close(out_file)
# })
# 
