// One rule for opening the wheel, selecting a ghost, and keeping either active.
export function trainingBuildBlocked({active,build,position,floorY,pending,alive=0,recovering=false}) {
  if(!active)return null;
  if(pending||alive>0||recovering)return 'encounter';
  if(!build||!position)return 'range';
  const {grid,offset,minGX,maxGX,minGZ,maxGZ}=build,h=grid/2;
  if(Math.abs(position.y-floorY)>2 || position.x<=minGX*grid+offset-h || position.x>=maxGX*grid+offset+h ||
     position.z<=minGZ*grid+offset-h || position.z>=maxGZ*grid+offset+h)return 'range';
  return null;
}
